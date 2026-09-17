const { analyzeEmergencyDescription, fallbackRuleAnalysis } = require('../src/services/aiService');

describe('AI Emergency Text Structuring Tests', () => {
  test('Rule-based analysis categorizes chest pain as cardiac_respiratory with CRITICAL urgency', () => {
    const text = "Patient has sudden chest pain and severe difficulty breathing.";
    const result = fallbackRuleAnalysis(text);

    expect(result.category).toBe('cardiac_respiratory');
    expect(result.urgencyFlag).toBe('CRITICAL');
    expect(result.dispatcherAttention).toBe(true);
    expect(result.disclaimer).toContain('Not a medical diagnosis');
  });

  test('analyzeEmergencyDescription completes gracefully without throwing', async () => {
    const text = "Family member fell down stairs and fractured arm.";
    const response = await analyzeEmergencyDescription(101, 1, text, '127.0.0.1');

    expect(response.analysis).toBeDefined();
    expect(response.analysis.category).toBe('trauma_accident');
    expect(response.analysis.disclaimer).toBeDefined();
  });
});
