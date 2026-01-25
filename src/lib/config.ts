// Configuration for MrApple Tech Transfers

export const config = {
  // n8n Webhooks (proxied through Next.js to avoid CORS)
  n8n: {
    baseUrl: "/api/n8n",
    endpoints: {
      login: "/tech-login",
      getPhones: "/tech-telefonos",
      transfer: "/tech-transferir",
    },
  },

  // Monday.com Board Info
  monday: {
    boardId: "672309386",
    columns: {
      tecnico: "color_mkzxt1at",
      imei: "texto7",
      estado: "estado",
      color: "texto6",
      grado: "text",
      gb: "gb0",
      estadoBateria: "texto07",
      fechaEntrega: "fecha6",
    },
    grupoReparaciones: "grupo_nuevo83404",
  },

  // Supabase
  supabase: {
    url: "https://mhvzpetucfdjkvutmpen.supabase.co",
    tableTecnicos: "mrapple_tecnicos",
    tableTransferLogs: "mrapple_transfer_logs",
  },

  // UI Config
  ui: {
    pinLength: 4,
    toastDuration: 3000,
  },
} as const;

export type Config = typeof config;
