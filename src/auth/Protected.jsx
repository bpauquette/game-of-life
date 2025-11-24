import React from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthProvider';

/**
 * A wrapper component that always renders its children.
 * This component exists for future extensibility but currently
 * just passes through children since protection is handled
 * at the action level via useProtectedAction hook.
 *
 * @param {Object} props - The component props
 * @param {React.ReactNode} props.children - The elements to render
 * @returns {React.ReactNode} The children
 */
function Protected({ children }) {
  // Always render children - protection is handled by useProtectedAction
  return children;
}

Protected.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Protected;