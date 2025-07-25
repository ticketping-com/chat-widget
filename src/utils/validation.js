// Input validation utilities
export function validateConfig(config) {
  const errors = [];

  // Handle null or undefined config
  if (!config) {
    errors.push('Configuration is required');
    return {
      isValid: false,
      errors
    };
  }

  // Required fields
  if (!config.appId) {
    errors.push('appId is required');
  } else if (typeof config.appId !== 'string') {
    errors.push('appId must be a string');
  }

  if (!config.teamSlug) {
    errors.push('teamSlug is required');
  } else if (typeof config.teamSlug !== 'string') {
    errors.push('teamSlug must be a string');
  }

  // Optional string fields
  if (config.apiBase !== undefined && typeof config.apiBase !== 'string') {
    errors.push('apiBase must be a string');
  }

  if (config.wsUrl !== undefined && typeof config.wsUrl !== 'string') {
    errors.push('wsUrl must be a string');
  }

  if (config.userJWT !== undefined && typeof config.userJWT !== 'string') {
    errors.push('userJWT must be a string');
  }

  // Boolean fields
  if (config.showPulseAnimation !== undefined && typeof config.showPulseAnimation !== 'boolean') {
    errors.push('showPulseAnimation must be a boolean');
  }

  if (config.autoStart !== undefined && typeof config.autoStart !== 'boolean') {
    errors.push('autoStart must be a boolean');
  }

  // Enum fields
  if (config.position !== undefined) {
    const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
    if (typeof config.position !== 'string' || !validPositions.includes(config.position)) {
      errors.push(`position must be one of: ${validPositions.join(', ')}`);
    }
  }

  if (config.theme !== undefined && typeof config.theme !== 'object') {
    const validThemes = ['default', 'dark', 'light'];
    if (typeof config.theme === 'string' && !validThemes.includes(config.theme)) {
      errors.push(`theme must be one of: ${validThemes.join(', ')}`);
    }
  }

  // Number fields
  if (config.maxFileSize !== undefined) {
    if (typeof config.maxFileSize !== 'number') {
      errors.push('maxFileSize must be a number');
    } else if (config.maxFileSize > 10 * 1024 * 1024) {
      errors.push('maxFileSize cannot exceed 10MB');
    }
  }

  // Array fields
  if (config.allowedFileTypes !== undefined && !Array.isArray(config.allowedFileTypes)) {
    errors.push('allowedFileTypes must be an array');
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
