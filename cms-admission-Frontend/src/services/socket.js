import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  || (typeof window !== 'undefined' && window.location.port === '5173'
      ? `http://${window.location.hostname || 'localhost'}:8000`
      : '');

let socketInstance = null;
const statusListeners = new Set();

function notifyStatusChange(status) {
  statusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch (e) {
      console.error('[Socket.IO] Error in status listener:', e);
    }
  });
}

export function getSocket(authInfo = null) {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      auth: authInfo ? { role: authInfo.role, username: authInfo.username } : {},
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected to real-time sync server:', socketInstance.id);
      notifyStatusChange(true);
      if (authInfo?.role) {
        socketInstance.emit('join_room', { room: 'staff_channel' });
        if (['vc', 'admin'].includes(authInfo.role)) {
          socketInstance.emit('join_room', { room: 'vc_channel' });
        }
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      notifyStatusChange(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
      notifyStatusChange(false);
    });
  } else if (authInfo) {
    socketInstance.auth = { role: authInfo.role, username: authInfo.username };
    if (socketInstance.connected && authInfo.role) {
      socketInstance.emit('join_room', { room: 'staff_channel' });
      if (['vc', 'admin'].includes(authInfo.role)) {
        socketInstance.emit('join_room', { room: 'vc_channel' });
      }
    }
  }

  return socketInstance;
}

export function subscribeToRealtimeEvents({
  onApplicationCreated,
  onApplicationUpdated,
  onApplicationDeleted,
  onSettingUpdated,
  onReconnect,
  onConnectionStatus,
}) {
  const socket = getSocket();

  if (onConnectionStatus) {
    statusListeners.add(onConnectionStatus);
    onConnectionStatus(socket.connected);
  }

  const handleCreated = (data) => {
    if (onApplicationCreated) onApplicationCreated(data);
  };

  const handleUpdated = (data) => {
    if (onApplicationUpdated) onApplicationUpdated(data);
  };

  const handleDeleted = (data) => {
    if (onApplicationDeleted) onApplicationDeleted(data);
  };

  const handleSetting = (data) => {
    if (onSettingUpdated) onSettingUpdated(data);
  };

  const handleConnect = () => {
    if (onReconnect) onReconnect();
  };

  socket.on('application_created', handleCreated);
  socket.on('application_updated', handleUpdated);
  socket.on('application_deleted', handleDeleted);
  socket.on('setting_updated', handleSetting);
  socket.on('connect', handleConnect);

  return () => {
    if (onConnectionStatus) {
      statusListeners.delete(onConnectionStatus);
    }
    socket.off('application_created', handleCreated);
    socket.off('application_updated', handleUpdated);
    socket.off('application_deleted', handleDeleted);
    socket.off('setting_updated', handleSetting);
    socket.off('connect', handleConnect);
  };
}
