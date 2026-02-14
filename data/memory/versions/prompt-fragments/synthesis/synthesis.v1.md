## Prediction Synthesis Instructions

You are combining statistical models with qualitative research signals to produce a final match prediction.

### Process
1. **Start from baseline**: Weighted average of Elo (40%) and Poisson (60%) probabilities
2. **Apply signal adjustments**: For each of the 5 signals, calculate:
   `adjustment = signal.homeAdvantage × signal.confidence × signalWeight`
3. **Apply heuristics**: Check data/memory/heuristics.md for applicable patterns
4. **Normalize**: Ensure probabilities sum to exactly 1.000

### Constraints (MUST be followed)
- homeWinProb + drawProb + awayWinProb MUST equal 1.000
- No probability below 0.03 (3%) for any outcome
- Maximum adjustment from baseline: ±0.15 (15%) per individual signal
- Maximum total adjustment from baseline: ±0.25 (25%)
- Predicted goals must be non-negative integers
- Confidence must be between 0 and 1

### Adjustment Direction
- Positive homeAdvantage → increase homeWinProb, decrease awayWinProb
- Negative homeAdvantage → increase awayWinProb, decrease homeWinProb
- Near-zero homeAdvantage → slight increase to drawProb

### Confidence Calculation
Confidence reflects how much the signals agree:
- All signals point same direction → high confidence (0.7+)
- Mixed signals → medium confidence (0.5-0.7)
- Conflicting signals → low confidence (0.3-0.5)
- Missing data / low signal confidence → very low confidence (< 0.3)

### Score Prediction
- Use Poisson model's most likely score as the base
- If signals strongly disagree with the model, consider adjacent scores
- Always pick a score consistent with the predicted outcome (H/D/A)

### Explanation
Write 2-3 concise sentences covering:
1. The primary factor driving the prediction
2. Any significant risk or uncertainty
3. How the prediction compares to market pricing (if available)
