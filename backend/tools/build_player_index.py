"""
Builds a player name index from StatsBomb event files.
Run once after cloning StatsBomb data:
  python -m tools.build_player_index

Output: data/statsbomb/player_index.json
  {
    "Virgil van Dijk": ["3788741", "3794685", ...],
    ...
  }
"""

import json
from pathlib import Path

EVENTS_DIR = Path("data/statsbomb/data/events")
MATCHES_DIR = Path("data/statsbomb/data/matches")
OUTPUT_PATH = Path("data/statsbomb/player_index.json")


def _load_match_season_map(matches_dir: Path) -> dict[str, tuple[str, str]]:
    """
    Returns {match_id: (season_name, competition_gender)}.
    competition_gender is 'male' or 'female' from StatsBomb match data.
    """
    match_season: dict[str, tuple[str, str]] = {}

    for season_file in matches_dir.glob("*/*.json"):
        with open(season_file, encoding="utf-8") as f:
            matches = json.load(f)
        for match in matches:
            match_id = str(match["match_id"])
            season = match.get("season", {}).get("season_name", "Unknown")
            competition = match.get("competition", {}) or {}
            raw_gender = str(competition.get("competition_gender", "")).strip().lower()
            competition_name = str(competition.get("competition_name", "")).strip().lower()

            combined = f"{raw_gender} {competition_name}"
            if any(token in combined for token in ("female", "women", "woman", "girls")):
                gender = "female"
            else:
                # Treat non-female competitions as male so we only exclude
                # explicitly female datasets.
                gender = "male"

            match_season[match_id] = (season, gender)

    return match_season


def build_player_index(events_dir: Path, matches_dir: Path, output_path: Path) -> None:
    """
    Scans all StatsBomb event files and builds a season-versioned player index:
      {"Player Name [Season]": [match_ids], ...}

    Players are treated independently per season. If a player appears in
    multiple competitions within the same season, those matches are merged
    into a single player-season entry.

    Args:
        events_dir: Path to the directory containing StatsBomb event JSON files.
        matches_dir: Path to the directory containing StatsBomb matches JSON files.
        output_path: Path where the index JSON will be written.
    """
    event_files = sorted(events_dir.glob("*.json"))
    if not event_files:
        raise FileNotFoundError(f"No event files found in {events_dir.resolve()}")

    print("Loading match -> season map...")
    match_season = _load_match_season_map(matches_dir)

    male_matches = {mid for mid, (_, g) in match_season.items() if g == "male"}
    female_matches = {mid for mid, (_, g) in match_season.items() if g == "female"}
    unknown_matches = {mid for mid, (_, g) in match_season.items() if g == "unknown"}
    print(
        f"  Male matches: {len(male_matches)}, "
        f"Female matches excluded: {len(female_matches)}, "
        f"Unknown excluded: {len(unknown_matches)}"
    )

    # Collect (player_name, match_id) pairs, then group by (name, season)
    # so that multiple competitions in the same season merge into one entry.
    # key: (raw_name, season_name) -> list of match_ids
    player_season_matches: dict[tuple[str, str], list[str]] = {}
    total = len(event_files)

    for i, events_path in enumerate(event_files, 1):
        print(f"  Scanning {i}/{total}: {events_path.name}    ", end="\r")

        match_id = events_path.stem
        if match_id not in male_matches:
            continue

        season_name = match_season[match_id][0]  # (season, gender)

        with open(events_path, encoding="utf-8") as f:
            events = json.load(f)

        seen_in_match: set[str] = set()
        for event in events:
            name = event.get("player", {}).get("name", "")
            if name and name not in seen_in_match:
                seen_in_match.add(name)
                key = (name, season_name)
                player_season_matches.setdefault(key, []).append(match_id)

    print()  # newline after \r

    # Build the versioned index: "Player Name [Season]" -> [match_ids]
    index: dict[str, list[str]] = {}
    for (name, season), match_ids in player_season_matches.items():
        versioned_key = f"{name} [{season}]"
        index[versioned_key] = match_ids

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"  OK Index built: {len(index)} player-seasons across {total} matches")
    print(f"  OK Saved to {output_path}")


if __name__ == "__main__":
    build_player_index(EVENTS_DIR, MATCHES_DIR, OUTPUT_PATH)
