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
    boardId: process.env.NEXT_PUBLIC_MONDAY_BOARD_ID || "672309386",
    columns: {
      tecnico: process.env.NEXT_PUBLIC_MONDAY_COL_TECNICO || "color_mkzxt1at",
      imei: process.env.NEXT_PUBLIC_MONDAY_COL_IMEI || "texto7",
      estado: process.env.NEXT_PUBLIC_MONDAY_COL_ESTADO || "estado",
      color: process.env.NEXT_PUBLIC_MONDAY_COL_COLOR || "texto6",
      grado: process.env.NEXT_PUBLIC_MONDAY_COL_GRADO || "text",
      gb: process.env.NEXT_PUBLIC_MONDAY_COL_GB || "gb0",
      estadoBateria: process.env.NEXT_PUBLIC_MONDAY_COL_ESTADO_BATERIA || "texto07",
      fechaEntrega: process.env.NEXT_PUBLIC_MONDAY_COL_FECHA_ENTREGA || "fecha6",
    },
    grupoReparaciones: process.env.NEXT_PUBLIC_MONDAY_GROUP_REPARACIONES || "grupo_nuevo83404",
  },

  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mhvzpetucfdjkvutmpen.supabase.co",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odnpwZXR1Y2Zkamt2dXRtcGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDI1MTgsImV4cCI6MjA4Mjg3ODUxOH0.PtUS0tuyXGUeKew2U-FxYIjfvaLsBByQYxxyONEcLOs",
    tableTecnicos: "mrapple_tecnicos",
    tableTransferLogs: "mrapple_transfer_logs",
  },

  // Intervals (ms)
  intervals: {
    polling: Number(process.env.NEXT_PUBLIC_POLLING_INTERVAL) || 30000,
    deduping: Number(process.env.NEXT_PUBLIC_DEDUPING_INTERVAL) || 2000,
    errorRetry: Number(process.env.NEXT_PUBLIC_ERROR_RETRY_INTERVAL) || 5000,
    toast: Number(process.env.NEXT_PUBLIC_TOAST_DURATION) || 5000,
  },

  // UI Config
  ui: {
    pinLength: 4,
  },
} as const;

export type Config = typeof config;
