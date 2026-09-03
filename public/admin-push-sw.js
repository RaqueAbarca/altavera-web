self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "Altavera",
      body: event.data ? event.data.text() : "Tenés una nueva notificación.",
    };
  }

  const title = payload.title || "Altavera";
  const options = {
    body: payload.body || "Nuevo pedido recibido.",
    icon: "/icon.png",
    badge: "/icon.png",
    tag: payload.tag || "altavera-new-order",
    renotify: true,
    silent: false,
    requireInteraction: true,
    vibrate: [180, 80, 180],
    data: {
      url: payload.url || "/admin/pedidos",
      orderId: payload.orderId || null,
    },
  };

  const notifyOpenAdminWindows = clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((windowClients) => {
      windowClients.forEach((client) => {
        client.postMessage({
          type: "ALTAVERA_ADMIN_PUSH",
          eventType: payload.eventType || null,
          orderId: payload.orderId || null,
        });
      });
    });

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      notifyOpenAdminWindows,
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/admin/pedidos";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
