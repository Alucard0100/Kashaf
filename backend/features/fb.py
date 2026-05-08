"""
Fullback feature extraction.
K=3: Overlapping Wingback / Inverted Build-Up / Defensive Anchor

Design notes:
- 5 core features for K=3 (1.67x ratio).
- centrality_bias: rips inverted/build-up FBs (Zinchenko/Trent)
  from traditional touchline-hugging fullbacks.
- progression_preference: identifies how the FB moves the ball
  forward — passing through lines vs. carrying up the wing.
- crosses_p90 + defensive_actions_p90: volume axes that separate
  the overlapping wingback from the defensive anchor.
- median_action_height: positional depth axis.
"""

import pandas as pd
from features.base import (
    get_total_minutes,
    median_action_height,
    crosses_p90,
    defensive_actions_p90,
    centrality_bias,
    progression_preference,
    # context
    progressive_passes_p90,
    progressive_carries_p90,
    cross_completion_pct,
    tackle_win_pct,
    aerial_win_pct,
    pass_completion_pct,
)

UNIT = "fb"


def extract_core_features(df: pd.DataFrame) -> dict:
    minutes = get_total_minutes(df)

    return {
        "median_action_height":  median_action_height(df),
        "crosses_p90":           crosses_p90(df, minutes),
        "defensive_actions_p90": defensive_actions_p90(df, minutes),
        "centrality_bias":       centrality_bias(df),
        "progression_preference": progression_preference(df, minutes, UNIT),
    }


def extract_context_features(df: pd.DataFrame) -> dict:
    minutes = get_total_minutes(df)

    return {
        "progressive_passes_p90":  progressive_passes_p90(df, minutes, UNIT),
        "progressive_carries_p90": progressive_carries_p90(df, minutes, UNIT),
        "cross_completion_pct":    cross_completion_pct(df),
        "tackle_win_pct":          tackle_win_pct(df),
        "aerial_win_pct":          aerial_win_pct(df),
        "pass_completion_pct":     pass_completion_pct(df),
    }


def extract_all(df: pd.DataFrame) -> dict:
    return {
        "core":    extract_core_features(df),
        "context": extract_context_features(df),
    }