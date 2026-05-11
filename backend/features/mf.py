"""
Midfielder feature extraction.
K=4: Destroyer / Deep-Lying Playmaker / Box-to-Box / Advanced Playmaker

Design notes:
- 6 core features chosen to separate 4 archetypes without curse
  of dimensionality. Rule of thumb: ~1.5x features per cluster.
- tackle_to_interception_ratio: separates aggressive ball-winners
  (Palhinha/Kanté) from positional game-readers (Rodri/Busquets).
- pass_risk_profile: progressive / completed separates safe shuttlers
  (Wijnaldum) from ambitious playmakers (Kroos).
- role_symmetry: def / (def + atk) isolates the B2B (~0.5) from
  pure DM (~1.0) and pure AM (~0.0).
- open_play_box_passes_p90: chance creation without corner-kick bias.
- median_action_height + dribble_attempts_p90: positional depth and
  1v1 intent axes that break garbage clusters.
"""

import pandas as pd
from features.base import (
    get_total_minutes,
    median_action_height,
    dribble_attempts_p90,
    tackle_to_interception_ratio,
    pass_risk_profile,
    role_symmetry,
    open_play_box_passes_p90,
    # context
    progressive_passes_p90,
    progressive_carries_p90,
    pass_completion_pct,
    tackle_win_pct,
    interceptions_p90,
    dribble_success_pct,
)

UNIT = "mf"


def extract_core_features(df: pd.DataFrame) -> dict:
    """
    6 core features for MF clustering.

    Feature -> Archetype signal:
      median_action_height:         positional depth — all archetypes
      dribble_attempts_p90:         Advanced Playmaker — 1v1 intent
      tackle_to_interception_ratio: Destroyer vs reader
      pass_risk_profile:            progressive ambition
      role_symmetry:                defensive/attacking balance
      open_play_box_passes_p90:     chance creation volume
    """
    minutes = get_total_minutes(df)

    return {
        "median_action_height":         median_action_height(df),
        "dribble_attempts_p90":         dribble_attempts_p90(df, minutes),
        "tackle_to_interception_ratio": tackle_to_interception_ratio(df),
        "pass_risk_profile":            pass_risk_profile(df, UNIT),
        "role_symmetry":                role_symmetry(df, minutes, UNIT),
        "open_play_box_passes_p90":     open_play_box_passes_p90(df, minutes),
    }


def extract_context_features(df: pd.DataFrame) -> dict:
    """Context features for MF scouting report / radar charts."""
    minutes = get_total_minutes(df)

    return {
        "progressive_passes_p90":  progressive_passes_p90(df, minutes, UNIT),
        "progressive_carries_p90": progressive_carries_p90(df, minutes, UNIT),
        "pass_completion_pct":     pass_completion_pct(df),
        "tackle_win_pct":          tackle_win_pct(df),
        "interceptions_p90":       interceptions_p90(df, minutes),
        "dribble_success_pct":     dribble_success_pct(df),
    }


def extract_all(df: pd.DataFrame) -> dict:
    """Returns both core and context feature dicts."""
    return {
        "core":    extract_core_features(df),
        "context": extract_context_features(df),
    }