# Mensajes al Cliente

Este documento lista todos los mensajes automáticos que recibe el cliente por WhatsApp.

**Formato estándar:**
```
Hola {nombre} 👋

{mensaje}

📍 *Mister Manzana*
```

---

## Por Estado

### En oficina Local (8)
```
Hola {nombre} 👋

Tu equipo llegó a nuestra oficina. Pronto te daremos un diagnóstico.

📍 *Mister Manzana*
```

---

### Revisión previa (106)
```
Hola {nombre} 👋

Ya tenemos tu equipo y estamos revisándolo para confirmar el diagnóstico.

📍 *Mister Manzana*
```

---

### En cotización 2P (14)
**Mensaje con link de aprobación:**
```
Hola {nombre} 👋

Tu {tipo_reparacion} está listo para reparar.

💰 Valor: ${valor}

👉 Aprueba o rechaza aquí:
{link}

📍 *Mister Manzana*
```

---

### Aprobación confirmada
```
✅ Gracias por aprobar

Tu equipo ya entró a reparación.
Te avisaremos cualquier actualización.

📍 *Mister Manzana*
```

---

### Heartbeat (En reparación 4+ horas)
```
Hola {nombre} 👋

Seguimos trabajando en tu equipo. Te avisaremos cuando esté listo.

📍 *Mister Manzana*
```

---

### REPARADO OFICINA (105)
```
Hola {nombre} 👋

🎉 ¡Tu equipo está reparado! Pronto te avisaremos para la entrega.

📍 *Mister Manzana*
```

---

### No se pudo arreglar (2)
```
Hola {nombre} 👋

Lamentamos informarte que no fue posible reparar tu equipo. Puedes pasar a recogerlo.

📍 *Mister Manzana*
```

---

### Por entregar - Pagar (7)
```
Hola {nombre} 👋

Tu equipo está listo. Para recogerlo, realiza el pago:

💰 Valor: ${valor}

📲 Nequi/Daviplata: 300XXXXXXX
🏦 Bancolombia: XXXX-XXXX-XXXX

Envía el comprobante a este chat.

📍 *Mister Manzana*
```

---

### Pago validado (automático)
```
Pago confirmado ✅

Tu equipo está listo para entrega.
Te avisaremos cuando puedas recogerlo.

Gracias por tu confianza.
📍 *Mister Manzana*
```

---

### Pago rechazado (automático)
```
Hola

Revisamos el comprobante y no logramos validarlo.
Por favor envíanos uno nuevo o escríbenos para ayudarte.

📍 *Mister Manzana*
```

---

### POR ENTREGAR (19)
```
Hola {nombre} 👋

🎉 ¡Ya puedes pasar a recoger tu equipo!

📍 *Mister Manzana*
```

---

### ENTREGADO (107)
```
Hola {nombre} 👋

Gracias por confiar en nosotros. ¡Fue un gusto atenderte!

Si tienes alguna duda, escríbenos.

📍 *Mister Manzana*
```

---

### GARANTÍA/LISTO (102)
```
Hola {nombre} 👋

Tu equipo en garantía está listo para recoger.

📍 *Mister Manzana*
```

---

### NO REPARADO/ENTREGADO (18)
```
Hola {nombre} 👋

Tu equipo fue entregado. Si necesitas algo más, aquí estamos.

📍 *Mister Manzana*
```

---

## Variables Disponibles

| Variable | Fuente | Ejemplo |
|----------|--------|---------|
| `{nombre}` | texto8 + texto9 | "Hare Test" |
| `{tipo_reparacion}` | texto | "Cambio de pantalla" |
| `{valor}` | valor_a_cobrar | "90000" |
| `{link}` | Generado por sistema | "https://...?t=token" |
| `{imei}` | texto03 | "123456789012345" |

---

## Reglas de Envío

1. **Horario:** Solo entre 9:00 - 19:00 Colombia (heartbeat)
2. **Teléfono válido:** Mínimo 10 dígitos
3. **No duplicar:** Si el cliente ya recibió mensaje de aprobación, no enviar el de "En reparación"
4. **Formato:** Siempre incluir emoji 👋 y firma 📍 *Mister Manzana*

---

## Workflows Responsables

| Mensaje | Workflow |
|---------|----------|
| Por estado (mayoría) | repair-status-notify |
| Link de aprobación | repair-approval-request |
| Confirmación aprobación | repair-approval-notify |
| Heartbeat | repair-heartbeat |
| Validación pago | repair-approval-whatsapp-response |
