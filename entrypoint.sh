#!/bin/sh
# Fix ownership of the data volume (mounted by Railway as root)
chown -R nextjs:nodejs /data 2>/dev/null || true
exec su -s /bin/sh nextjs -c "node server.js"
