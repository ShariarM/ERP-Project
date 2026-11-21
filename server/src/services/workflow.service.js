// Which status changes are allowed, and which roles may make them.
const WORKFLOW_RULES = {
  sales: {
    draft:     { confirmed: ['admin', 'sales'] },
    confirmed: { invoiced:  ['admin', 'accounting'] },
    invoiced:  { paid:      ['admin', 'accounting'] },
    paid:      {} // end of the line
  },
  leave: {
    pending:  { approved: ['admin'], rejected: ['admin'] },
    approved: {},
    rejected: {}
  }
};

// An error that carries the HTTP status the controller should answer with.
export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function validateTransition(entityType, currentStatus, nextStatus, userRole) {
  const rules = WORKFLOW_RULES[entityType];
  if (!rules) throw httpError(400, `Invalid entity type: ${entityType}`);

  // Object.hasOwn: values like "constructor" or "__proto__" must not count as statuses
  const fromRules = Object.hasOwn(rules, currentStatus) ? rules[currentStatus] : {};
  const allowedRoles = Object.hasOwn(fromRules, nextStatus) ? fromRules[nextStatus] : null;

  if (!allowedRoles) {
    throw httpError(400, `Invalid transition from '${currentStatus}' to '${nextStatus}' for ${entityType}`);
  }
  if (!allowedRoles.includes(userRole)) {
    throw httpError(403, `Permission denied. Role '${userRole}' cannot change status to '${nextStatus}'`);
  }
  return true;
}
