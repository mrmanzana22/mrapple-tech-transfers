# Guía Operativa - Onboarding

Guía práctica para el equipo de Mister Manzana: Daniela, técnicos y Guille.

---

## Regla de Oro

> **Si el estado está bien, el cliente está informado.**

El sistema envía todos los mensajes automáticamente. Tu trabajo es mantener los estados actualizados.

---

## 👩 Daniela (Servicio al Cliente)

### Tu rol
Tú controlas el flujo. Cambias estados y el sistema hace el resto.

### Acciones diarias

| Momento | Acción en Monday | Sistema hace |
|---------|------------------|--------------|
| Cliente entrega equipo | Crear item, estado "En oficina" | Notifica al cliente |
| Técnico revisa | Cambiar a "En cotización 2P" | Envía link de aprobación |
| Cliente aprobó | **Nada** (es automático) | Cambia a "En reparación" |
| Técnico terminó | Verificar estado correcto | Notifica al cliente |
| Equipo listo para cobro | Cambiar a "Por entregar - Pagar" | Envía datos de pago |
| Guille validó pago | **Nada** (es automático) | Cambia a "Por entregar" |
| Entrega el equipo | Cambiar a "ENTREGADO" | Mensaje de cierre |

### Estados que TÚ cambias manualmente
- En oficina (8) → al crear item
- En cotización 2P (14) → cuando técnico da diagnóstico
- Por entregar - Pagar (7) → cuando está listo para cobrar
- ENTREGADO (107) → al entregar

### Estados que cambian SOLOS
- Revisión previa (106) → 20 min después de "En oficina"
- En reparación (12) → cuando cliente aprueba
- Por entregar (19) → cuando Guille valida pago

### ❌ NO hacer
- No escribir al cliente sobre estados (el sistema lo hace)
- No cambiar estados que el sistema maneja
- No apurar al cliente (el link tiene 48h)

### ✅ SÍ hacer
- Mantener Monday actualizado
- Revisar que los datos del cliente estén completos
- Atender excepciones (cliente llama con dudas)

---

## 🧑‍🔧 Técnicos

### Tu rol
Reparar equipos y marcar el resultado. El sistema notifica al cliente.

### Solo 3 cosas importantes

1. **Trabajar el equipo**
2. **Marcar cuando termines:**
   - "REPARADO OFICINA" si funcionó
   - "No se pudo arreglar" si no funcionó
3. **Transferir si es necesario** (botón en la app)

### Usando la App de Técnicos

**URL:** (la app web)

**Pestañas:**
- **Teléfonos:** Equipos en tu cola
- **Clientes:** Equipos de clientes esperando
- **Equipo:** Tu información

**Botones en pestaña Clientes:**
- 🟢 **Reparado Oficina** - Reparación exitosa
- 🔴 **No Reparado** - No se pudo arreglar
- 🔵 **Transferir** - Pasar a otro técnico

### ❌ NO hacer
- No escribir al cliente por WhatsApp
- No explicar procesos técnicos al cliente
- No cambiar estados que no te corresponden

### ✅ SÍ hacer
- Marcar el resultado real (éxito o fallo)
- Transferir si no puedes continuar
- Avisar a Daniela si hay algo urgente

---

## 💰 Guille (Validación de Pagos)

### Tu rol
Validar comprobantes de pago. El sistema hace todo lo demás.

### Cómo funciona

1. **Recibes imagen** de comprobante por WhatsApp
2. **Verificas** que el pago sea real y correcto
3. **Respondes:**
   - `1` = Pago válido ✓
   - `2` = Pago inválido ✗

### Eso es todo.

El sistema automáticamente:
- Actualiza Monday
- Notifica al cliente
- Notifica a Daniela

### ❌ NO hacer
- No escribir al cliente directamente
- No cambiar estados en Monday
- No responder con otro texto (solo 1 o 2)

### ✅ SÍ hacer
- Verificar monto correcto
- Verificar fecha reciente
- Responder rápido (el cliente espera)

---

## 📱 Mensajes que recibe el cliente

El cliente recibe WhatsApp automático en cada paso:

| Momento | Mensaje |
|---------|---------|
| Entrega equipo | "Tu equipo llegó..." |
| Revisión | "Estamos revisando..." |
| Cotización | "Tu reparación cuesta $X. Aprueba aquí: [link]" |
| Aprobación | "Gracias por aprobar. Ya entramos a reparación" |
| Si demora | "Seguimos trabajando..." (cada 4h) |
| Reparado | "¡Tu equipo está listo!" |
| Pago | "Para recoger, realiza el pago: $X" |
| Pago OK | "Pago confirmado. Ya puedes pasar" |
| Entrega | "Gracias por confiar en nosotros" |

---

## 🚨 Situaciones Especiales

### Cliente llama preguntando por su equipo
1. Buscar en Monday por nombre o teléfono
2. Ver el estado actual
3. Explicar en qué paso está
4. **NO cambiar estados** para "apurar"

### Cliente dice que no recibió mensaje
1. Verificar teléfono en Monday (debe tener código de país)
2. Verificar que WhatsApp esté activo
3. Si persiste, enviar mensaje manual

### Cliente quiere aprobar por teléfono (no por link)
1. Solo el jefe puede marcar "aprobación verbal"
2. Usar el botón correspondiente en el admin
3. Se registra diferente en el sistema

### Pago rechazado
1. El cliente recibe mensaje automático
2. Puede enviar nuevo comprobante
3. Guille valida de nuevo

---

## 📞 Contactos del Sistema

| Rol | Contacto |
|-----|----------|
| Guille (pagos) | 573175530069 |
| Daniela (operación) | 573017428749 |
| Soporte técnico | (Hare) |

---

## 🔧 Problemas Frecuentes

### "El estado no cambió"
- Esperar unos segundos (el sistema puede demorar)
- Refrescar Monday
- Si persiste, avisar a soporte

### "El cliente no recibió el link"
- Verificar teléfono correcto
- El link dura 48h
- Se puede reenviar cambiando el estado de nuevo

### "Guille no recibió el comprobante"
- Verificar que el cliente envió imagen (no PDF)
- Revisar ejecuciones en n8n
- El cliente puede reenviar

---

## ✨ Tips

1. **Monday es la fuente de verdad** - Si está en Monday, el sistema lo sabe
2. **No apurar el sistema** - Los automáticos tienen tiempos definidos
3. **Menos intervención = mejor** - Dejar que el sistema trabaje
4. **Ante la duda, preguntar** - Mejor confirmar que dañar el flujo
