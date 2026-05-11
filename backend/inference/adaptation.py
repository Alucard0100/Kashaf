import numpy as np

# Center Back (CB) Weights
CB_WEIGHTS = {
    'tackle_to_interception_ratio': 2.0,       # Pure tactical DNA (Stopper vs Sweeper)
    'median_defensive_action_height': 1.5,     # High line vs Low block
    'progressive_passes_p90': 1.2,             # Ball-playing ability
    'headed_actions_p90': 1.0,                 # Standard duty
    'interceptions_p90': 0.7,                  # Volume noise
    'tackles_p90': 0.7                         # Volume noise
}

# Fullback (FB) Weights
FB_WEIGHTS = {
    'centrality_bias': 2.0,                    # Crucial Inverted FB identifier
    'progression_preference': 1.5,             # Pass vs Carry DNA
    'median_action_height': 1.5,               # Wingback vs Defensive FB
    'defensive_actions_p90': 0.7,              # Volume noise
    'crosses_p90': 0.7                         # Heavily team-dependent volume
}

# Midfielder (MF) Weights
MF_WEIGHTS = {
    'role_symmetry': 2.0,                      # Pure tactical DNA (Destroyer vs AM)
    'pass_risk_profile': 2.0,                  # DLP vs Safe shuttler
    'tackle_to_interception_ratio': 1.5,       # Aggressor vs Reader
    'median_action_height': 1.2,               # Positional anchor
    'open_play_box_passes_p90': 1.0,           # Attacking penetration
    'dribble_attempts_p90': 0.5                # Extreme youth outlier danger
}

# Winger (WG) Weights
WG_WEIGHTS = {
    'cut_inside_carry_pct': 2.0,               # Inside Forward vs Touchline Winger
    'action_bias': 1.5,                        # Finisher vs Creator
    'box_magnetism': 1.5,                      # Penalty box presence
    'median_lateral_position': 1.5,            # Width utilization
    'attacking_directness': 1.2,               # Drive to goal
    'progressive_passes_p90': 1.0,             # Playmaking volume
    'dribble_attempts_p90': 0.7                # Volume noise
}

# Striker (ST) Weights
ST_WEIGHTS = {
    'penalty_area_touch_pct': 2.0,             # Poacher vs Deep forward
    'drop_deep_reception_pct': 2.0,            # Core False 9 identifier
    'headed_shots_pct': 1.5,                   # Target Man identifier
    'shots_p90': 1.2,                          # Fundamental, but still volume
    'dribble_attempts_p90': 0.5                # Extreme youth outlier danger
}

WEIGHTS_BY_UNIT = {
    "cb": CB_WEIGHTS,
    "fb": FB_WEIGHTS,
    "mf": MF_WEIGHTS,
    "wg": WG_WEIGHTS,
    "st": ST_WEIGHTS
}

def apply_domain_adaptation(x_scaled: np.ndarray, unit: str, feature_cols: list[str]) -> np.ndarray:
    """
    Applies Z-Score clipping (-3.0 to 3.0) and position-specific feature weighting
    to prevent extreme outliers (especially from youth data) from distorting
    K-Means clustering and cosine similarity matching.
    
    Can handle both 1D vectors (inference) and 2D matrices (training).
    """
    # 1. Z-Score Clipping
    clipped = np.clip(x_scaled, -3.0, 3.0)
    
    # 2. Build feature weight array mapped perfectly to the columns
    unit_weights = WEIGHTS_BY_UNIT.get(unit.lower(), {})
    weight_list = [unit_weights.get(col, 1.0) for col in feature_cols]
    weight_array = np.array(weight_list, dtype=float)
    
    # 3. Apply weights (broadcasts over 2D or 1D arrays automatically)
    return clipped * weight_array
