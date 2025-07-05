// Input validation utilities
export function validateConfig(config) {
  const errors = [];

  if (!config.appId) {
    errors.push('appId is required');
  }

  if (config.maxFileSize && config.maxFileSize > 10 * 1024 * 1024) {
    errors.push('maxFileSize cannot exceed 10MB');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateMessage(text, maxLength = 5000) {
  if (!text || text.trim().length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  if (text.length > maxLength) {
    return { isValid: false, error: `Message too long (max ${maxLength} characters)` };
  }

  return { isValid: true };
}
