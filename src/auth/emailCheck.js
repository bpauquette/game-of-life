import { checkEmail } from './api';

/**
 * Checks if an email is registered and stores it for future reference
 * @param {string} email - The email to check
 * @returns {Promise<boolean>} - True if email exists, false otherwise
 */
export async function isRegistered(email) {
  if (!email || !email.trim()) {
    return false;
  }

  try {
    const result = await checkEmail(email.trim());
    const exists = result.exists;

    // Store the email for future reference (remember the user)
    if (exists) {
      localStorage.setItem('lastCheckedEmail', email.trim());
      localStorage.setItem('emailExists', 'true');
    } else {
      localStorage.setItem('lastCheckedEmail', email.trim());
      localStorage.setItem('emailExists', 'false');
    }

    return exists;
  } catch (error) {
    console.error('Failed to check email registration:', error);
    // On error, assume not registered to be safe
    return false;
  }
}

/**
 * Gets the last checked email from storage
 * @returns {string|null} - The last checked email or null
 */
export function getLastCheckedEmail() {
  return localStorage.getItem('lastCheckedEmail');
}

/**
 * Checks if the last checked email exists (cached result)
 * @returns {boolean} - True if last checked email exists
 */
export function isLastEmailRegistered() {
  return localStorage.getItem('emailExists') === 'true';
}

/**
 * Clears stored email information
 */
export function clearStoredEmail() {
  localStorage.removeItem('lastCheckedEmail');
  localStorage.removeItem('emailExists');
}