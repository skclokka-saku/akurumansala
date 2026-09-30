const { authenticate, authorize } = require('./auth');

module.exports = {
    adminOnly: [authenticate, authorize('admin')],
    teacherOrAdmin: [authenticate, authorize('admin', 'teacher')]
};