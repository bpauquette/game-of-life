import React from 'react';
import PropTypes from 'prop-types';

/**
 * SkipLink Component
 * 
 * Provides ADA-compliant skip links for keyboard navigation.
 * Skip links are keyboard-focusable links that allow users to skip
 * over repetitive content (like navigation) and jump directly to main content.
 * 
 * The link is visually hidden until it receives keyboard focus, using
 * off-screen positioning rather than display: none to maintain accessibility.
 * 
 * @param {string} href - The target anchor (e.g., "#main-content")
 * @param {string} children - The link text (e.g., "Skip to main content")
 * @param {string} className - Optional CSS class for styling
 */
function SkipLink({ href, children, className }) {
  return (
    <a
      href={href}
      className={`skip-link ${className || ''}`}
      style={{
        // Visually hide the skip link by positioning it off-screen
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        // Make sure it appears in the focus order at the very beginning
        zIndex: 10000,
      }}
      onFocus={(e) => {
        // When focused, make the skip link visible
        e.currentTarget.style.position = 'fixed';
        e.currentTarget.style.left = '0';
        e.currentTarget.style.top = '0';
        e.currentTarget.style.width = 'auto';
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.padding = '8px 16px';
        e.currentTarget.style.backgroundColor = 'var(--accent-focus)';
        e.currentTarget.style.color = 'var(--text-inverse)';
        e.currentTarget.style.textDecoration = 'none';
        e.currentTarget.style.fontSize = '16px';
        e.currentTarget.style.fontWeight = '600';
        e.currentTarget.style.zIndex = '10001';
        e.currentTarget.style.border = '2px solid var(--text-inverse)';
        e.currentTarget.style.borderRadius = '4px';
        e.currentTarget.style.margin = '8px';
      }}
      onBlur={(e) => {
        // When blurred, hide the skip link again
        e.currentTarget.style.position = 'absolute';
        e.currentTarget.style.left = '-10000px';
        e.currentTarget.style.top = 'auto';
        e.currentTarget.style.width = '1px';
        e.currentTarget.style.height = '1px';
        e.currentTarget.style.overflow = 'hidden';
        e.currentTarget.style.padding = '';
        e.currentTarget.style.backgroundColor = '';
        e.currentTarget.style.color = '';
        e.currentTarget.style.textDecoration = '';
        e.currentTarget.style.fontSize = '';
        e.currentTarget.style.fontWeight = '';
        e.currentTarget.style.border = '';
        e.currentTarget.style.borderRadius = '';
        e.currentTarget.style.margin = '';
      }}
    >
      {children}
    </a>
  );
}

SkipLink.propTypes = {
  href: PropTypes.string.isRequired,
  children: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default SkipLink;
