# Informe Completo de API — Ventas, Servicios y Deudas

## Autenticación global

Todos los endpoints requieren:
```
Authorization: Bearer <access_token>
```
Sin token → `401 Unauthorized`. Con token válido pero sin rol en la tienda → `403 Forbidden`.

---

## Mapa completo de URLs

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/sales/ventas/` | Listado paginado de ventas |
| POST | `/api/sales/ventas/` | Crear venta |
| GET | `/api/sales/ventas/{numero_comprobante}/` | Detalle de venta |
| DELETE | `/api/sales/ventas/{numero_comprobante}/` | Cancelar venta (soft delete) |
| GET | `/api/sales/ventas/{numero_comprobante}/ticket/` | PDF ticket 80mm |
| POST | `/api/sales/ventas/{pk}/confirmar-sunat/` | Confirmar relleno SUNAT |
| POST | `/api/sales/ventas/{numero_comprobante}/consultar-estado/` | Consultar estado en SUNAT |
| POST | `/api/sales/ventas/{numero_comprobante}/anular/` | Anular comprobante (mismo día) |
| POST | `/api/sales/ventas/{numero_comprobante}/nota-credito/` | Emitir nota de crédito |
| GET | `/api/sales/clientes/` | Listado de clientes |
| PATCH | `/api/sales/clientes/{id}/` | Actualizar cliente |
| GET | `/api/services/servicio/` | Listado paginado de servicios |
| POST | `/api/services/servicio/` | Crear servicio |
| GET | `/api/services/servicio/{numero_comprobante}/` | Detalle de servicio |
| DELETE | `/api/services/servicio/{numero_comprobante}/` | Cancelar servicio (soft delete) |
| GET | `/api/services/servicio/{numero_comprobante}/ticket/` | PDF ticket 80mm |
| POST | `/api/services/servicio/{numero_comprobante}/consultar-estado/` | Consultar estado en SUNAT |
| POST | `/api/services/servicio/{numero_comprobante}/anular/` | Anular comprobante (mismo día) |
| POST | `/api/services/servicio/{numero_comprobante}/nota-credito/` | Emitir nota de crédito |
| GET | `/api/finances/deudas/` | Listado de deudas |
| GET | `/api/finances/pagos/` | Historial de pagos de deudas |
| POST | `/api/finances/pagos/` | Registrar pago de deuda |

> **Nota:** en ventas, `confirmar-sunat` usa `{pk}` (ID entero), no `numero_comprobante`. Todos los demás usan `numero_comprobante`.

---

## Enumeraciones globales

### TipoDocumento
| Valor | Display |
|---|---|
| `0` | Sin documento |
| `1` | DNI |
| `4` | Pasaporte |
| `6` | RUC |
| `7` | Carnet de extranjería |

### TipoOperacion (aplica a ventas Y servicios)
| Valor | Display |
|---|---|
| `NORMAL` | Operación normal |
| `CREDITO` | Operación a crédito |
| `SUNAT` | Operación con comprobante SUNAT |

### MetodoPago
| Valor | Display |
|---|---|
| `EFECTIVO` | Efectivo |
| `TRANSFERENCIA` | Transferencia bancaria |
| `YAPE` | Yape |
| `PLIN` | Plin |
| `TARJETA` | Tarjeta de débito/crédito |

### EstadoSUNAT
| Valor | Significado para el frontend |
|---|---|
| `NO_APLICA` | Venta/servicio NORMAL o CREDITO, sin comprobante electrónico |
| `PENDIENTE` | SUNAT: hay productos sin factura, esperando confirmación de relleno (solo ventas) |
| `ENVIADO` | Comprobante enviado a SUNAT, esperando procesamiento |
| `ACEPTADO` | SUNAT lo aceptó, comprobante válido |
| `RECHAZADO` | SUNAT lo rechazó, ver `motivo_rechazo` |
| `ANULADO` | Anulado vía comunicación de baja o nota de crédito |

### TipoComprobante
| Valor | Display |
|---|---|
| `01` | Factura |
| `03` | Boleta |

### TipoNotaCredito (ventas)
| Valor | Cuándo usar |
|---|---|
| `01` | Anulación total de la operación |
| `06` | Devolución total de productos |
| `07` | Devolución parcial por ítem específico |
| `09` | Disminución en el valor (descuento posterior) |

### TipoNotaCredito (servicios — solo 2 tipos)
| Valor | Cuándo usar |
|---|---|
| `01` | Anulación total |
| `09` | Disminución en el valor (nuevo total acordado) |

---

## VENTAS — Detalle completo

### Aislamiento de datos
El queryset siempre filtra `tienda__in = tiendas_del_usuario`. No es posible acceder a ventas de tiendas ajenas aunque se sepa el `numero_comprobante`.

El historial incluye ventas activas **e inactivas** (anuladas). Solo las acciones de escritura (crear, anular, nota de crédito) requieren `is_active=true`.

---

### `GET /api/sales/ventas/` — Listado

#### Filtros disponibles
| Parámetro | Tipo | Descripción |
|---|---|---|
| `tienda` | integer | Filtra por tienda específica (`tienda_id`) |
| `tipo` | string | `NORMAL`, `CREDITO`, `SUNAT` |
| `metodo_pago` | string | Case-insensitive |
| `fecha` | `YYYY-MM-DD` | Día exacto de registro |
| `fecha_desde` | `YYYY-MM-DD` | Rango desde (inclusive) |
| `fecha_hasta` | `YYYY-MM-DD` | Rango hasta (inclusive) |
| `trabajador` | integer | `usuario_id` de quien registró la venta |
| `search` | string | Busca en nombre, teléfono y email del cliente |
| `ordering` | string | `fecha`, `-fecha`, `total`, `-total` |
| `page_size` | integer | 1–100, default 20 |
| `cursor` | string | Token opaco de paginación |

#### Paginación (cursor-based)
```json
{
  "next": "http://localhost:8000/api/sales/ventas/?cursor=cD0yMDI2...",
  "previous": null,
  "results": [...]
}
```
- Ordenación por defecto: `-fecha, -id` (más reciente primero)
- Usar el valor de `next`/`previous` tal cual como URL para navegar
- Cuando `next` es `null`, no hay más páginas

---

### Response completo — Venta

#### Caso 1: Venta NORMAL sin cliente
```json
{
  "id": 42,
  "tienda": {
    "id": 1,
    "nombre_sede": "Tienda Centro"
  },
  "usuario_tienda": {
    "id": 3,
    "nombre": "Carlos Mendoza"
  },
  "cliente": null,
  "tipo": "NORMAL",
  "tipo_display": "Operación normal",
  "metodo_pago": "YAPE",
  "metodo_pago_display": "Yape",
  "estado_sunat": "NO_APLICA",
  "estado_sunat_display": "No aplica",
  "tipo_comprobante": "",
  "tipo_comprobante_display": "",
  "numero_comprobante": "T001-00000042",
  "hash_cpe": "",
  "url_xml": "",
  "url_pdf_a4": "",
  "url_pdf_ticket": "",
  "url_cdr": "",
  "motivo_rechazo": "",
  "fecha": "2026-05-02T14:30:00Z",
  "total": "75.50",
  "is_active": true,
  "detalle": [
    {
      "id": 101,
      "lote_producto_id": 15,
      "producto_nombre": "Cemento Portland",
      "producto_codigo": "CEM-001",
      "unidad_medida": "Bolsa",
      "cantidad": "5.000",
      "precio": "15.10",
      "subtotal": "75.50",
      "es_averiado": false
    }
  ],
  "lineas_sunat": [],
  "propuesta_sunat": null,
  "nota_credito": null
}
```

#### Caso 2: Venta CREDITO con cliente (genera deuda)
```json
{
  "id": 43,
  "tienda": {
    "id": 1,
    "nombre_sede": "Tienda Centro"
  },
  "usuario_tienda": {
    "id": 3,
    "nombre": "Carlos Mendoza"
  },
  "cliente": {
    "id": 7,
    "nombre": "Juan Pérez",
    "tipo_documento": "1",
    "tipo_documento_display": "DNI",
    "numero_documento": "12345678",
    "telefono": "987654321",
    "email": "juan@email.com",
    "direccion": "Av. Lima 123",
    "saldo_total": "350.00"
  },
  "tipo": "CREDITO",
  "tipo_display": "Operación a crédito",
  "metodo_pago": "EFECTIVO",
  "metodo_pago_display": "Efectivo",
  "estado_sunat": "NO_APLICA",
  "estado_sunat_display": "No aplica",
  "tipo_comprobante": "",
  "tipo_comprobante_display": "",
  "numero_comprobante": "T001-00000043",
  "hash_cpe": "",
  "url_xml": "",
  "url_pdf_a4": "",
  "url_pdf_ticket": "",
  "url_cdr": "",
  "motivo_rechazo": "",
  "fecha": "2026-05-02T15:00:00Z",
  "total": "350.00",
  "is_active": true,
  "detalle": [
    {
      "id": 102,
      "lote_producto_id": 22,
      "producto_nombre": "Fierro Corrugado 3/8",
      "producto_codigo": "FIE-001",
      "unidad_medida": "Varilla",
      "cantidad": "10.000",
      "precio": "35.00",
      "subtotal": "350.00",
      "es_averiado": false
    }
  ],
  "lineas_sunat": [],
  "propuesta_sunat": null,
  "nota_credito": null
}
```
> `saldo_total` del cliente es la suma de todos sus `Deuda` con `estado=ACTIVA`. Si pagó parcialmente ya refleja el saldo real.

#### Caso 3: Venta SUNAT Boleta — estado PENDIENTE (con relleno)
Ocurre cuando algún producto vendido no tiene factura (`con_factura=False` en su lote). El sistema propone un producto sustituto con factura por el mismo monto.
```json
{
  "id": 44,
  "tienda": {
    "id": 1,
    "nombre_sede": "Tienda Centro"
  },
  "usuario_tienda": {
    "id": 3,
    "nombre": "Carlos Mendoza"
  },
  "cliente": null,
  "tipo": "SUNAT",
  "tipo_display": "Operación con comprobante SUNAT",
  "metodo_pago": "EFECTIVO",
  "metodo_pago_display": "Efectivo",
  "estado_sunat": "PENDIENTE",
  "estado_sunat_display": "Pendiente de confirmación de relleno",
  "tipo_comprobante": "03",
  "tipo_comprobante_display": "Boleta",
  "numero_comprobante": "",
  "hash_cpe": "",
  "url_xml": "",
  "url_pdf_a4": "",
  "url_pdf_ticket": "",
  "url_cdr": "",
  "motivo_rechazo": "",
  "fecha": "2026-05-02T16:00:00Z",
  "total": "150.00",
  "is_active": true,
  "detalle": [
    {
      "id": 105,
      "lote_producto_id": 9,
      "producto_nombre": "Pintura sin marca",
      "producto_codigo": "PIN-002",
      "unidad_medida": "Galón",
      "cantidad": "2.000",
      "precio": "75.00",
      "subtotal": "150.00",
      "es_averiado": false
    }
  ],
  "lineas_sunat": [],
  "propuesta_sunat": [
    {
      "lote_producto_id": 12,
      "lote_producto_nombre": "Pintura Vencedor",
      "cantidad": "2.000",
      "precio": "75.00",
      "subtotal": "150.00",
      "es_relleno": true,
      "lote_producto_original_id": 9
    }
  ],
  "nota_credito": null
}
```
> El frontend debe mostrar la propuesta y pedir confirmación. El campo `es_relleno: true` indica que ese lote no fue el vendido físicamente sino el sustituto para SUNAT.

#### Caso 4: Venta SUNAT Factura — estado ENVIADO
Estado intermedio entre envío y aceptación por SUNAT:
```json
{
  "id": 45,
  "tipo": "SUNAT",
  "tipo_comprobante": "01",
  "tipo_comprobante_display": "Factura",
  "estado_sunat": "ENVIADO",
  "estado_sunat_display": "Enviado al PSE",
  "numero_comprobante": "F001-00000005",
  "hash_cpe": "abc123def456...",
  "url_xml": "https://apisunat.com/xml/F001-00000005.xml",
  "url_pdf_a4": "https://apisunat.com/pdf/a4/F001-00000005.pdf",
  "url_pdf_ticket": "https://apisunat.com/pdf/ticket/F001-00000005.pdf",
  "url_cdr": "",
  "motivo_rechazo": "",
  "total": "175.00",
  "is_active": true,
  "detalle": [
    {
      "id": 110,
      "lote_producto_id": 30,
      "producto_nombre": "Cable Thhn #12",
      "producto_codigo": "ELE-045",
      "unidad_medida": "Metro",
      "cantidad": "50.000",
      "precio": "3.50",
      "subtotal": "175.00",
      "es_averiado": false
    }
  ],
  "lineas_sunat": [
    {
      "id": 88,
      "producto_nombre": "Cable Thhn #12",
      "producto_codigo": "ELE-045",
      "unidad_medida": "MTR",
      "tipo_afectacion_igv": "10",
      "cantidad": "50.000",
      "precio": "3.50",
      "valor_unitario_sin_igv": "2.966102",
      "subtotal": "175.00",
      "es_relleno": false,
      "producto_original_nombre": null
    }
  ],
  "propuesta_sunat": null,
  "nota_credito": null
}
```
> `url_cdr` viene vacío hasta que SUNAT procese. Luego se llena al consultar estado.

#### Caso 5: Venta SUNAT — estado ACEPTADO
```json
{
  "id": 45,
  "estado_sunat": "ACEPTADO",
  "estado_sunat_display": "Aceptado por SUNAT",
  "numero_comprobante": "F001-00000005",
  "hash_cpe": "abc123def456...",
  "url_xml": "https://apisunat.com/xml/F001-00000005.xml",
  "url_pdf_a4": "https://apisunat.com/pdf/a4/F001-00000005.pdf",
  "url_pdf_ticket": "https://apisunat.com/pdf/ticket/F001-00000005.pdf",
  "url_cdr": "https://apisunat.com/cdr/F001-00000005.xml",
  "motivo_rechazo": "",
  "is_active": true
}
```

#### Caso 6: Venta SUNAT — estado RECHAZADO
```json
{
  "id": 46,
  "estado_sunat": "RECHAZADO",
  "estado_sunat_display": "Rechazado por SUNAT",
  "numero_comprobante": "F001-00000006",
  "motivo_rechazo": "El número de RUC 20999999999 no existe en el padrón de SUNAT",
  "is_active": true
}
```

#### Caso 7: Venta SUNAT anulada con nota de crédito tipo 01 o 06
```json
{
  "id": 43,
  "estado_sunat": "ANULADO",
  "is_active": false,
  "nota_credito": {
    "id": 8,
    "tipo_comprobante": "01",
    "tipo_comprobante_display": "Anulación de la operación",
    "numero_comprobante": "NC01-00000001",
    "hash_cpe": "xyz789...",
    "url_xml": "https://apisunat.com/xml/NC01-00000001.xml",
    "url_pdf_a4": "https://apisunat.com/pdf/a4/NC01-00000001.pdf",
    "url_pdf_ticket": "https://apisunat.com/pdf/ticket/NC01-00000001.pdf",
    "url_cdr": "https://apisunat.com/cdr/NC01-00000001.xml",
    "motivo": "Cliente devuelve mercadería completa",
    "fecha": "2026-05-02T16:00:00Z",
    "items_nc": []
  }
}
```

#### Caso 8: Venta con nota de crédito tipo 07 (devolución parcial por ítem)
La venta sigue activa (`is_active=true`) porque solo se devolvió parte:
```json
{
  "id": 43,
  "is_active": true,
  "nota_credito": {
    "id": 9,
    "tipo_comprobante": "07",
    "tipo_comprobante_display": "Devolución por ítem",
    "numero_comprobante": "NC01-00000002",
    "motivo": "Cliente devuelve 2 unidades",
    "fecha": "2026-05-02T17:00:00Z",
    "items_nc": [
      { "lote_producto_id": 15, "cantidad": "2.000" }
    ]
  }
}
```

#### Caso 9: Venta con nota de crédito tipo 09 (disminución en valor)
La venta sigue activa y el stock no se modifica:
```json
{
  "id": 43,
  "is_active": true,
  "nota_credito": {
    "id": 10,
    "tipo_comprobante": "09",
    "tipo_comprobante_display": "Disminución en el valor",
    "numero_comprobante": "NC01-00000003",
    "motivo": "Descuento acordado posterior",
    "fecha": "2026-05-02T18:00:00Z",
    "items_nc": [
      { "lote_producto_id": 15, "precio_nuevo": "10.00" }
    ]
  }
}
```

#### Caso 10: Venta NORMAL cancelada (soft delete)
```json
{
  "id": 42,
  "is_active": false,
  "estado_sunat": "NO_APLICA"
}
```
> El stock se devuelve automáticamente al cancelar. Los productos averiados regresan a `cantidad_averiada`, los normales a `cantidad_actual`.

---

### `POST /api/sales/ventas/` — Crear venta

#### Request — Venta NORMAL con producto por FIFO
```json
{
  "tienda_id": 1,
  "tipo": "NORMAL",
  "metodo_pago": "EFECTIVO",
  "productos": [
    {
      "producto_id": 5,
      "cantidad": "3.000",
      "precio_venta": "12.50"
    }
  ]
}
```

#### Request — Venta NORMAL con lote específico
```json
{
  "tienda_id": 1,
  "tipo": "NORMAL",
  "metodo_pago": "YAPE",
  "productos": [
    {
      "lote_producto_id": 22,
      "cantidad": "1.500"
    }
  ]
}
```
> Sin `precio_venta` usa `precio_venta_mercado` del lote automáticamente.

#### Request — Venta NORMAL con múltiples productos
```json
{
  "tienda_id": 1,
  "tipo": "NORMAL",
  "metodo_pago": "TRANSFERENCIA",
  "productos": [
    { "producto_id": 5, "cantidad": "2.000", "precio_venta": "15.00" },
    { "lote_producto_id": 8, "cantidad": "3.500" },
    { "producto_id": 12, "cantidad": "1.000", "precio_venta": "8.00" }
  ]
}
```

#### Request — Venta CREDITO cliente existente
```json
{
  "tienda_id": 1,
  "tipo": "CREDITO",
  "metodo_pago": "EFECTIVO",
  "cliente_id": 7,
  "productos": [
    {
      "producto_id": 3,
      "cantidad": "1.000",
      "precio_venta": "45.00"
    }
  ]
}
```

#### Request — Venta CREDITO cliente nuevo
El cliente con ese `numero_documento` se crea si no existe, o se reutiliza si ya existe en esa tienda:
```json
{
  "tienda_id": 1,
  "tipo": "CREDITO",
  "metodo_pago": "TRANSFERENCIA",
  "cliente": {
    "nombre": "María García",
    "tipo_documento": "1",
    "numero_documento": "45678912",
    "telefono": "999111222",
    "email": "maria@email.com",
    "direccion": "Jr. Los Pinos 234"
  },
  "productos": [
    { "producto_id": 2, "cantidad": "2.000" }
  ]
}
```
> Para ventas CREDITO, el cliente necesita todos los campos: `tipo_documento`, `numero_documento`, `telefono`, `email`, `direccion`. Si el cliente existente no tiene alguno de esos campos, la API rechaza con error.

#### Request — Venta SUNAT Boleta sin cliente
```json
{
  "tienda_id": 1,
  "tipo": "SUNAT",
  "metodo_pago": "EFECTIVO",
  "tipo_comprobante": "03",
  "productos": [
    { "producto_id": 4, "cantidad": "5.000" }
  ]
}
```

#### Request — Venta SUNAT Boleta con cliente DNI
```json
{
  "tienda_id": 1,
  "tipo": "SUNAT",
  "metodo_pago": "YAPE",
  "tipo_comprobante": "03",
  "cliente": {
    "nombre": "Pedro Huanca",
    "tipo_documento": "1",
    "numero_documento": "31456789",
    "telefono": "956321478"
  },
  "productos": [
    { "producto_id": 4, "cantidad": "5.000" }
  ]
}
```

#### Request — Venta SUNAT Factura (cliente con RUC obligatorio)
```json
{
  "tienda_id": 1,
  "tipo": "SUNAT",
  "metodo_pago": "TRANSFERENCIA",
  "tipo_comprobante": "01",
  "cliente": {
    "nombre": "Constructora Los Andes SAC",
    "tipo_documento": "6",
    "numero_documento": "20512345678",
    "direccion": "Av. Industrial 456"
  },
  "productos": [
    { "producto_id": 5, "cantidad": "10.000", "precio_venta": "8.50" }
  ]
}
```

#### Request — Venta con producto averiado
```json
{
  "tienda_id": 1,
  "tipo": "NORMAL",
  "metodo_pago": "EFECTIVO",
  "productos": [
    {
      "producto_id": 1,
      "cantidad": "1.000",
      "precio_venta": "6.00",
      "es_averiado": true
    }
  ]
}
```

#### Request — Misma venta con mismo producto normal y averiado
```json
{
  "tienda_id": 1,
  "tipo": "NORMAL",
  "metodo_pago": "EFECTIVO",
  "productos": [
    { "lote_producto_id": 15, "cantidad": "2.000", "precio_venta": "12.00", "es_averiado": false },
    { "lote_producto_id": 15, "cantidad": "1.000", "precio_venta": "6.00", "es_averiado": true }
  ]
}
```

#### Reglas de validación en creación de ventas
| Regla | Error |
|---|---|
| `tipo=CREDITO` sin cliente | `"Una venta a credito requiere cliente"` |
| `tipo=SUNAT` sin `tipo_comprobante` | `"Una venta SUNAT requiere tipo_comprobante"` |
| `tipo_comprobante=01` sin cliente con RUC | `"Una factura requiere que el cliente tenga RUC"` |
| `tipo_comprobante=03` con cliente RUC | `"Una boleta no puede emitirse con RUC"` |
| `tipo_comprobante=03` con cliente sin número de documento | `"Una boleta con cliente requiere número de documento"` |
| Precio menor a `precio_venta_base` del lote | `"Precio mínimo para 'X': S/Y. Ingresaste S/Z (S/W por debajo del mínimo)"` |
| Stock insuficiente | `"Stock insuficiente. Disponible: X"` |
| Lote no pertenece a la tienda | `"El lote X no existe o no pertenece a esta tienda"` |
| `cliente_id` y `cliente` juntos | `"No puede proporcionar un cliente existente y uno nuevo"` |
| `lote_producto_id` y `producto_id` juntos en el mismo ítem | `"No puede proporcionar lote y producto al mismo tiempo"` |
| Ninguno de los dos enviado en un ítem | `"Debe proporcionar lote o producto"` |
| Mismo lote + mismo tipo (averiado/normal) duplicado | `"No puede repetir el mismo lote con el mismo tipo"` |
| Tienda sin `EmpresaEmisora` configurada | `"La tienda no tiene empresa emisora configurada"` |
| Cliente CREDITO sin `telefono` | `"El campo 'teléfono' es obligatorio para ventas a crédito"` |
| Cliente CREDITO sin `email` | `"El campo 'email' es obligatorio para ventas a crédito"` |
| Cliente CREDITO sin `direccion` | `"El campo 'dirección' es obligatorio para ventas a crédito"` |
| Cliente CREDITO sin `numero_documento` | `"El campo 'número de documento' es obligatorio para ventas a crédito"` |

---

### `POST /api/sales/ventas/{pk}/confirmar-sunat/`
Solo cuando `estado_sunat = PENDIENTE`. El `{pk}` es el **ID entero** de la venta (no el `numero_comprobante`).

#### Request
```json
{
  "propuesta": [
    {
      "lote_producto_id": 12,
      "cantidad": "2.000",
      "precio": "75.00",
      "es_relleno": true,
      "lote_producto_original_id": 9
    },
    {
      "lote_producto_id": 3,
      "cantidad": "5.000",
      "precio": "8.50",
      "es_relleno": false,
      "lote_producto_original_id": null
    }
  ]
}
```

#### Response
Venta completa con `estado_sunat=ENVIADO` y `numero_comprobante` ya generado (ej: `F001-00000001`).

---

### `POST /api/sales/ventas/{numero_comprobante}/consultar-estado/`
Solo cuando `estado_sunat = ENVIADO`. Consulta SUNAT y actualiza el estado en BD.

No requiere body. Response: venta actualizada completa.

---

### `POST /api/sales/ventas/{numero_comprobante}/anular/`
Anula el comprobante en SUNAT usando comunicación de baja (facturas) o resumen diario (boletas). Solo funciona si el comprobante fue emitido **el mismo día**.

#### Condiciones requeridas
- `tipo = SUNAT`
- `estado_sunat = ACEPTADO`
- Emitido el día de hoy

#### Request
```json
{
  "motivo": "Error al registrar la venta"
}
```

#### Response
Venta con `is_active=false`. HTTP `200 OK`.

---

### `POST /api/sales/ventas/{numero_comprobante}/nota-credito/`
Para ventas de **días anteriores** con `estado_sunat = ACEPTADO`.

#### Tipo 01 — Anulación total
```json
{
  "codigo_tipo": "01",
  "motivo": "Acuerdo con el cliente"
}
```
Revierte todo el stock. La venta queda `is_active=false`, `estado_sunat=ANULADO`.

#### Tipo 06 — Devolución total
```json
{
  "codigo_tipo": "06",
  "motivo": "Cliente devuelve toda la mercadería"
}
```
Igual que el 01 en efectos (revierte stock completo y anula).

#### Tipo 07 — Devolución parcial por ítem
```json
{
  "codigo_tipo": "07",
  "motivo": "Cliente devuelve 2 unidades",
  "items": [
    { "lote_producto_id": 15, "cantidad": "2.000" }
  ]
}
```
Devuelve solo la cantidad indicada al stock. La venta **sigue activa** (`is_active=true`). El `lote_producto_id` debe pertenecer al detalle original de esa venta y la cantidad no puede superar la cantidad vendida.

#### Tipo 09 — Disminución en el valor
```json
{
  "codigo_tipo": "09",
  "motivo": "Descuento acordado posterior a la emisión",
  "items": [
    { "lote_producto_id": 15, "precio_nuevo": "10.00" }
  ]
}
```
No mueve stock. La venta sigue activa. `precio_nuevo` debe ser mayor a cero, menor al precio original y mayor o igual al `precio_venta_base` del lote.

---

### `GET /api/sales/ventas/{numero_comprobante}/ticket/`
Genera el PDF ticket 80mm. Solo para `tipo=NORMAL` y `tipo=CREDITO`.

Retorna `Content-Type: application/pdf` directamente (no JSON).

Si se intenta con `tipo=SUNAT` → `400 "Las ventas SUNAT ya tienen comprobante electrónico"`.

---

### `DELETE /api/sales/ventas/{numero_comprobante}/`

| Condición | Resultado |
|---|---|
| Venta ya desactivada | `400 "La venta ya ha sido desactivada"` |
| `tipo=SUNAT` con `estado_sunat=ACEPTADO` | `400 "No se puede cancelar... debe emitirse nota de crédito"` |
| `tipo=SUNAT` con `estado_sunat=ENVIADO` | `400 "No se puede cancelar... debe emitirse nota de crédito"` |
| Cualquier otro caso | `204 No Content` — soft delete, devuelve stock |

Al cancelar, el stock se devuelve:
- Productos con `es_averiado=true` → se suman a `cantidad_averiada` del lote
- Productos con `es_averiado=false` → se suman a `cantidad_actual` del lote

---

## CLIENTES

### `GET /api/sales/clientes/`
Sin paginación. Devuelve todos los clientes de las tiendas del usuario, ordenados por nombre.

Los clientes son **por tienda**: un cliente creado en la Tienda 1 no aparece en la Tienda 2, aunque tengan el mismo documento.

#### Filtros
| Parámetro | Descripción |
|---|---|
| `search` | Busca por `nombre` o `numero_documento` |

#### Response
```json
[
  {
    "id": 7,
    "nombre": "Juan Pérez",
    "tipo_documento": "1",
    "tipo_documento_display": "DNI",
    "numero_documento": "12345678",
    "telefono": "987654321",
    "email": "juan@email.com",
    "direccion": "Av. Lima 123",
    "saldo_total": "350.00"
  },
  {
    "id": 8,
    "nombre": "Constructora SAC",
    "tipo_documento": "6",
    "tipo_documento_display": "RUC",
    "numero_documento": "20512345678",
    "telefono": "",
    "email": null,
    "direccion": "Av. Industrial 456",
    "saldo_total": "0.00"
  }
]
```
> `saldo_total` es la suma de `saldo` de todas las `Deuda` con `estado=ACTIVA` del cliente. Si no tiene deudas activas es `"0.00"`.

---

### `PATCH /api/sales/clientes/{id}/`
Actualización parcial. Solo enviar los campos que se quieren cambiar.

#### Request
```json
{
  "telefono": "999888777",
  "email": "nuevo@email.com",
  "direccion": "Nueva dirección 456"
}
```

#### Validaciones al actualizar
| Regla | Error |
|---|---|
| `tipo_documento=1` (DNI) con longitud distinta de 8 dígitos | `"El DNI debe tener exactamente 8 dígitos numéricos"` |
| `tipo_documento=6` (RUC) con longitud distinta de 11 dígitos | `"El RUC debe tener exactamente 11 dígitos numéricos"` |

Response: objeto cliente completo actualizado.

---

## SERVICIOS — Detalle completo

### Diferencias clave con ventas
1. No tienen líneas de detalle de productos — el monto es global con `descripcion` libre
2. Tienen `fecha_inicio` y `fecha_fin` además del `fecha` de registro
3. El response de `nota_credito` viene como campo extra al cuerpo del objeto solo en el endpoint de nota de crédito — en listado/detalle normal no aparece ese campo
4. Los tipos de nota de crédito disponibles son solo `01` y `09` (no hay `06` ni `07`)
5. No tienen flujo de propuesta/relleno SUNAT — siempre se envían directamente al crear
6. Las URLs SUNAT vienen como `null` cuando no aplica (en ventas son strings vacíos `""`)
7. No tienen filtro `trabajador`

### Aislamiento de datos
Idéntico a ventas: siempre filtra por `tienda__in = tiendas_del_usuario`.

---

### `GET /api/services/servicio/` — Listado

#### Filtros disponibles
| Parámetro | Tipo | Descripción |
|---|---|---|
| `tienda` | integer | ID de tienda específica |
| `tipo` | string | `NORMAL`, `CREDITO`, `SUNAT` |
| `estado_sunat` | string | Cualquier valor de `EstadoSUNAT` |
| `cliente` | integer | ID del cliente |
| `fecha` | `YYYY-MM-DD` | Día exacto de registro |
| `fecha_desde` | `YYYY-MM-DD` | Rango desde (inclusive) |
| `fecha_hasta` | `YYYY-MM-DD` | Rango hasta (inclusive) |
| `search` | string | Busca en nombre, teléfono del cliente y `descripcion` |
| `ordering` | string | `fecha`, `-fecha`, `total`, `-total` |
| `page_size` | integer | 1–100, default 20 |
| `cursor` | string | Token de paginación |

#### Paginación (cursor-based)
```json
{
  "next": "http://localhost:8000/api/services/servicio/?cursor=cD0yMDI2...",
  "previous": null,
  "results": [...]
}
```

---

### Response completo — Servicio

#### Caso 1: Servicio NORMAL
```json
{
  "id": 18,
  "tienda": {
    "id": 1,
    "nombre_sede": "Tienda Centro"
  },
  "usuario_tienda": {
    "id": 3,
    "nombre": "Carlos Mendoza"
  },
  "cliente": null,
  "deuda": null,
  "tipo": "NORMAL",
  "tipo_display": "Operación normal",
  "metodo_pago": "EFECTIVO",
  "metodo_pago_display": "Efectivo",
  "estado_sunat": "NO_APLICA",
  "estado_sunat_display": "No aplica",
  "tipo_comprobante": "",
  "tipo_comprobante_display": "",
  "numero_comprobante": "SV001-00000018",
  "hash_cpe": null,
  "url_xml": null,
  "url_pdf_a4": null,
  "url_pdf_ticket": null,
  "url_cdr": null,
  "motivo_rechazo": "",
  "descripcion": "Instalación de puerta de madera y ventana corrediza",
  "fecha_inicio": "2026-05-01",
  "fecha_fin": "2026-05-02",
  "total": "350.00",
  "is_active": true,
  "fecha": "2026-05-02T09:00:00Z"
}
```

#### Caso 2: Servicio CREDITO (genera deuda)
```json
{
  "id": 19,
  "tienda": {
    "id": 1,
    "nombre_sede": "Tienda Centro"
  },
  "usuario_tienda": {
    "id": 3,
    "nombre": "Carlos Mendoza"
  },
  "cliente": {
    "id": 7,
    "nombre": "Juan Pérez",
    "telefono": "987654321",
    "email": "juan@email.com"
  },
  "deuda": 12,
  "tipo": "CREDITO",
  "tipo_display": "Operación a crédito",
  "metodo_pago": "EFECTIVO",
  "metodo_pago_display": "Efectivo",
  "estado_sunat": "NO_APLICA",
  "estado_sunat_display": "No aplica",
  "tipo_comprobante": "",
  "tipo_comprobante_display": "",
  "numero_comprobante": "SV001-00000019",
  "hash_cpe": null,
  "url_xml": null,
  "url_pdf_a4": null,
  "url_pdf_ticket": null,
  "url_cdr": null,
  "motivo_rechazo": "",
  "descripcion": "Reparación de techo y colocación de calaminas",
  "fecha_inicio": "2026-05-01",
  "fecha_fin": "2026-05-05",
  "total": "850.00",
  "is_active": true,
  "fecha": "2026-05-02T10:00:00Z"
}
```
> `deuda` es el **ID entero** de la `Deuda` creada en finanzas. Usar `/api/finances/deudas/?cliente=7` para obtener los detalles del saldo.

#### Caso 3: Servicio SUNAT Boleta — ENVIADO
```json
{
  "id": 20,
  "tipo": "SUNAT",
  "tipo_comprobante": "03",
  "tipo_comprobante_display": "Boleta",
  "estado_sunat": "ENVIADO",
  "estado_sunat_display": "Enviado al PSE",
  "numero_comprobante": "B001-00000003",
  "hash_cpe": "def456...",
  "url_xml": "https://apisunat.com/xml/B001-00000003.xml",
  "url_pdf_a4": "https://apisunat.com/pdf/a4/B001-00000003.pdf",
  "url_pdf_ticket": "https://apisunat.com/pdf/ticket/B001-00000003.pdf",
  "url_cdr": null,
  "descripcion": "Instalación de cielo raso PVC 20m2",
  "fecha_inicio": "2026-05-01",
  "fecha_fin": "2026-05-02",
  "total": "590.00",
  "is_active": true
}
```

#### Caso 4: Servicio SUNAT Factura — ACEPTADO
```json
{
  "id": 21,
  "tipo": "SUNAT",
  "tipo_comprobante": "01",
  "tipo_comprobante_display": "Factura",
  "estado_sunat": "ACEPTADO",
  "estado_sunat_display": "Aceptado por SUNAT",
  "numero_comprobante": "F001-00000007",
  "hash_cpe": "abc123...",
  "url_xml": "https://apisunat.com/xml/F001-00000007.xml",
  "url_pdf_a4": "https://apisunat.com/pdf/a4/F001-00000007.pdf",
  "url_pdf_ticket": "https://apisunat.com/pdf/ticket/F001-00000007.pdf",
  "url_cdr": "https://apisunat.com/cdr/F001-00000007.xml",
  "descripcion": "Instalación de sistema de drenaje pluvial 40m",
  "fecha_inicio": "2026-04-20",
  "fecha_fin": "2026-04-28",
  "total": "1180.00",
  "is_active": true
}
```

#### Caso 5: Servicio SUNAT — RECHAZADO
```json
{
  "id": 22,
  "estado_sunat": "RECHAZADO",
  "estado_sunat_display": "Rechazado por SUNAT",
  "motivo_rechazo": "Error en los datos del emisor",
  "is_active": true
}
```

#### Caso 6: Servicio anulado (soft delete o nota de crédito)
```json
{
  "id": 18,
  "is_active": false,
  "estado_sunat": "ANULADO"
}
```

---

### `POST /api/services/servicio/` — Crear servicio

#### Request — NORMAL sin cliente
```json
{
  "tienda_id": 1,
  "descripcion": "Instalación de puerta de madera",
  "fecha_inicio": "2026-05-01",
  "fecha_fin": "2026-05-01",
  "total": "150.00",
  "tipo": "NORMAL",
  "metodo_pago": "EFECTIVO"
}
```

#### Request — NORMAL múltiples trabajos en descripción
```json
{
  "tienda_id": 1,
  "descripcion": "Instalación de puerta S/150 + instalación de ventana S/250",
  "fecha_inicio": "2026-05-01",
  "fecha_fin": "2026-05-03",
  "total": "400.00",
  "tipo": "NORMAL",
  "metodo_pago": "YAPE"
}
```

#### Request — CREDITO cliente existente
```json
{
  "tienda_id": 1,
  "descripcion": "Reparación de techo y colocación de calaminas",
  "fecha_inicio": "2026-05-01",
  "fecha_fin": "2026-05-05",
  "total": "850.00",
  "tipo": "CREDITO",
  "metodo_pago": "EFECTIVO",
  "cliente_id": 7
}
```

#### Request — CREDITO cliente nuevo
El cliente con ese `numero_documento` se crea si no existe, o se reutiliza si ya existe:
```json
{
  "tienda_id": 1,
  "descripcion": "Mantenimiento de instalaciones eléctricas",
  "fecha_inicio": "2026-05-01",
  "fecha_fin": "2026-05-04",
  "total": "420.00",
  "tipo": "CREDITO",
  "metodo_pago": "TRANSFERENCIA",
  "cliente": {
    "nombre": "Carlos Mendoza",
    "tipo_documento": "1",
    "numero_documento": "45678912",
    "telefono": "987123456",
    "direccion": "Jr. Los Pinos 234, Arequipa"
  }
}
```

#### Request — SUNAT Boleta sin cliente
```json
{
  "tienda_id": 1,
  "descripcion": "Instalación de cielo raso PVC 20m2",
  "fecha_inicio": "2026-05-01",
  "fecha_fin": "2026-05-02",
  "total": "590.00",
  "tipo": "SUNAT",
  "metodo_pago": "YAPE",
  "tipo_comprobante": "03"
}
```

#### Request — SUNAT Boleta con cliente DNI
```json
{
  "tienda_id": 1,
  "descripcion": "Colocación de mayólicas en baño 8m2",
  "fecha_inicio": "2026-05-01",
  "fecha_fin": "2026-05-03",
  "total": "472.00",
  "tipo": "SUNAT",
  "metodo_pago": "YAPE",
  "tipo_comprobante": "03",
  "cliente": {
    "nombre": "Pedro Huanca",
    "tipo_documento": "1",
    "numero_documento": "31456789",
    "telefono": "956321478"
  }
}
```

#### Request — SUNAT Factura (cliente con RUC obligatorio)
```json
{
  "tienda_id": 1,
  "descripcion": "Instalación de sistema de drenaje pluvial",
  "fecha_inicio": "2026-05-01",
  "fecha_fin": "2026-05-08",
  "total": "1180.00",
  "tipo": "SUNAT",
  "metodo_pago": "TRANSFERENCIA",
  "tipo_comprobante": "01",
  "cliente": {
    "nombre": "Constructora Los Andes SAC",
    "tipo_documento": "6",
    "numero_documento": "20601234567",
    "direccion": "Av. Industrial 456, Arequipa"
  }
}
```

#### Reglas de validación en creación de servicios
| Regla | Error |
|---|---|
| `fecha_fin < fecha_inicio` | `"La fecha_fin no puede ser menor que fecha_inicio"` |
| `tipo=NORMAL` con `cliente_id` o `cliente` | `"Un servicio normal no debe tener cliente"` |
| `tipo=CREDITO` sin cliente | `"Un servicio a crédito requiere cliente"` |
| `tipo=CREDITO` con `cliente_id` y `cliente` juntos | `"No puede enviar cliente_id y cliente al mismo tiempo"` |
| `tipo=SUNAT` sin `tipo_comprobante` | `"Un servicio SUNAT requiere tipo_comprobante (01=Factura, 03=Boleta)"` |
| `tipo_comprobante=01` sin cliente | `"Una factura requiere cliente con RUC"` |
| `tipo_comprobante=01` con cliente sin RUC | `"Una factura requiere que el cliente tenga RUC"` |
| Usuario sin acceso a la tienda | `"El usuario no tiene acceso a esta tienda"` |

> **IGV:** todos los servicios están gravados al 18%. El `total` que se envía ya debe incluir el IGV. El sistema calcula el valor base internamente para el XML de SUNAT.

---

### `POST /api/services/servicio/{numero_comprobante}/nota-credito/`
Para servicios de **días anteriores** con `estado_sunat = ACEPTADO`.

#### Tipo 01 — Anulación total
```json
{
  "codigo_tipo": "01",
  "motivo": "Acuerdo de anulación con el cliente"
}
```

#### Response (estructura diferente al listado normal)
```json
{
  "id": 18,
  "is_active": false,
  "estado_sunat": "ANULADO",
  "tipo": "SUNAT",
  "total": "350.00",
  ...,
  "nota_credito": {
    "numero": "NC01-00000003",
    "estado": "ACEPTADO",
    "pdf_ticket": "https://apisunat.com/pdf/ticket/NC01-00000003.pdf",
    "pdf_a4": "https://apisunat.com/pdf/a4/NC01-00000003.pdf",
    "xml": "https://apisunat.com/xml/NC01-00000003.xml",
    "cdr": "https://apisunat.com/cdr/NC01-00000003.xml"
  }
}
```
> El campo `nota_credito` solo aparece en el response de este endpoint. En el listado/detalle normal del servicio ese campo no existe.

#### Tipo 09 — Disminución en el valor
```json
{
  "codigo_tipo": "09",
  "motivo": "Descuento acordado con el cliente",
  "precio_nuevo": "250.00"
}
```
> `precio_nuevo` es el **nuevo total completo del servicio** (no la diferencia). Debe ser mayor a cero y menor al `total` original. El servicio sigue activo, no mueve stock.

---

### `POST /api/services/servicio/{numero_comprobante}/anular/`
Solo si el comprobante fue emitido **hoy** y tiene `estado_sunat = ACEPTADO`.

#### Request
```json
{
  "motivo": "Error al registrar el servicio"
}
```

Response: servicio con `is_active=false`. HTTP `200 OK`.

---

### `GET /api/services/servicio/{numero_comprobante}/ticket/`
Solo para `tipo=NORMAL` y `tipo=CREDITO`. Retorna `Content-Type: application/pdf`.

Si se intenta con `tipo=SUNAT` → `400 "Los servicios SUNAT ya tienen comprobante electrónico"`.

---

### `DELETE /api/services/servicio/{numero_comprobante}/`

| Condición | Resultado |
|---|---|
| Servicio ya desactivado | `400 "El servicio ya fue desactivado"` |
| `tipo=SUNAT` con `estado_sunat=ACEPTADO` | `400 "No se puede desactivar... usar anulación o nota de crédito"` |
| `tipo=SUNAT` con `estado_sunat=ENVIADO` | `400 "No se puede desactivar... usar anulación o nota de crédito"` |
| Cualquier otro caso | `204 No Content` — soft delete |

---

## DEUDAS Y PAGOS

### `GET /api/finances/deudas/`
**Permisos:** solo `ADMINISTRADOR` y `DUENO` (los trabajadores no tienen acceso).

Filtra automáticamente por las tiendas del usuario. No se puede ver deudas de tiendas ajenas.

#### Filtros disponibles
| Parámetro | Ejemplo | Descripción |
|---|---|---|
| `cliente` | `?cliente=7` | Deudas de un cliente específico |
| `estado` | `?estado=ACTIVA` | `ACTIVA` o `PAGADA` |
| `venta` | `?venta=42` | Deuda originada en esa venta (ID) |
| `servicio` | `?servicio=18` | Deuda originada en ese servicio (ID) |
| `ordering` | `?ordering=-saldo` | `monto_total`, `-monto_total`, `saldo`, `-saldo` |

#### Response
```json
[
  {
    "id": 12,
    "origen_id": 43,
    "tipo_origen": "venta",
    "numero_comprobante": "T001-00000043",
    "monto_total": "350.00",
    "saldo": "200.00",
    "estado": "ACTIVA",
    "pagos": [
      {
        "fecha": "2026-04-15",
        "monto": "150.00"
      }
    ]
  },
  {
    "id": 13,
    "origen_id": 19,
    "tipo_origen": "servicio",
    "numero_comprobante": "SV001-00000019",
    "monto_total": "850.00",
    "saldo": "0.00",
    "estado": "PAGADA",
    "pagos": [
      { "fecha": "2026-04-20", "monto": "400.00" },
      { "fecha": "2026-04-28", "monto": "450.00" }
    ]
  }
]
```

| Campo | Descripción |
|---|---|
| `origen_id` | ID de la venta o servicio que generó la deuda |
| `tipo_origen` | `"venta"` o `"servicio"` |
| `numero_comprobante` | Número del comprobante del origen (ej: `T001-00000043`) |
| `monto_total` | Monto original de la deuda (no cambia con los pagos) |
| `saldo` | Saldo pendiente actual (se reduce con cada pago) |
| `estado` | `ACTIVA` mientras tenga saldo, `PAGADA` cuando llega a cero |
| `pagos` | Array con el historial cronológico de pagos |

---

### `POST /api/finances/pagos/` — Registrar pago
**Permisos:** cualquier rol (`TRABAJADOR`, `ADMINISTRADOR`, `DUENO`).

Al registrar un pago exitoso, el `saldo` de la deuda se reduce automáticamente. Si el saldo llega a cero, `estado` cambia a `PAGADA`.

#### Request
```json
{
  "deuda_id": 12,
  "monto": "100.00"
}
```

#### Validaciones
| Regla | Error |
|---|---|
| Deuda no existe o es de otra tienda | `"La deuda no existe o no tienes acceso"` |
| `estado=PAGADA` | `"La deuda ya esta pagada"` |
| `monto <= 0` | `"El monto debe ser mayor a 0"` |
| `monto > saldo` | `"El monto excede el saldo"` |

#### Response
Retorna directamente el **PDF del comprobante de pago** (`Content-Type: application/pdf`). No retorna JSON. El PDF contiene el detalle del pago, saldo anterior, nuevo saldo, y datos del cliente.

---

### `GET /api/finances/pagos/` — Historial de pagos
Lista todos los pagos de deudas de las tiendas del usuario.

#### Filtros disponibles
| Parámetro | Descripción |
|---|---|
| `deuda__cliente` | ID del cliente |
| `deuda__estado` | `ACTIVA` o `PAGADA` |
| `deuda__venta` | ID de la venta origen |
| `deuda__servicio` | ID del servicio origen |

#### Response
```json
[
  {
    "id": 33,
    "cliente_id": 7,
    "origen_id": 43,
    "tipo_origen": "venta",
    "numero_comprobante": "T001-00000043",
    "fecha": "2026-04-15",
    "monto": "150.00"
  },
  {
    "id": 34,
    "cliente_id": 7,
    "origen_id": 19,
    "tipo_origen": "servicio",
    "numero_comprobante": "SV001-00000019",
    "fecha": "2026-04-20",
    "monto": "400.00"
  }
]
```

---

## Árbol de decisión para el frontend

```
¿Qué mostrar por cada registro de venta o servicio?

is_active = false
  ├─ Badge "Anulado" / tachado
  └─ Si tiene nota_credito → mostrar link al comprobante NC

is_active = true
  ├─ tipo = NORMAL
  │   └─ Botón "Ticket PDF" → GET .../ticket/
  │
  ├─ tipo = CREDITO
  │   ├─ Botón "Ticket PDF" → GET .../ticket/
  │   └─ Botón "Ver deuda" → GET /api/finances/deudas/?cliente={cliente.id}
  │
  └─ tipo = SUNAT
      ├─ estado_sunat = PENDIENTE  (solo ventas)
      │   └─ Botón "Confirmar propuesta" → mostrar propuesta_sunat y POST /confirmar-sunat/
      │
      ├─ estado_sunat = ENVIADO
      │   ├─ Badge "Procesando en SUNAT"
      │   └─ Botón "Verificar estado" → POST /consultar-estado/
      │
      ├─ estado_sunat = ACEPTADO
      │   ├─ Links: url_pdf_a4, url_pdf_ticket, url_xml, url_cdr
      │   ├─ Si emitido hoy → Botón "Anular" → POST /anular/
      │   └─ Si emitido fecha anterior → Botón "Nota de crédito" → POST /nota-credito/
      │
      ├─ estado_sunat = RECHAZADO
      │   └─ Mostrar campo motivo_rechazo
      │
      └─ estado_sunat = ANULADO
          └─ Badge "Anulado" (ya inactivo)
```

---

## Errores HTTP estándar

| Código | Cuándo ocurre |
|---|---|
| `400 Bad Request` | Validación fallida, datos inválidos, reglas de negocio |
| `401 Unauthorized` | Sin token o token expirado |
| `403 Forbidden` | Token válido pero sin rol en esa tienda o acción |
| `404 Not Found` | `numero_comprobante` no existe o no pertenece al usuario |
| `405 Method Not Allowed` | Método HTTP no permitido (ej: PUT en vez de PATCH) |

Los errores 400 vienen como JSON con dos formatos posibles:

```json
{ "detail": "Mensaje de error general" }
```

```json
{
  "numero_documento": ["El DNI debe tener exactamente 8 dígitos numéricos."],
  "tipo_comprobante": ["Este campo es requerido."]
}
```

---

## Diferencias consolidadas Ventas vs Servicios

| Aspecto | Ventas | Servicios |
|---|---|---|
| Líneas de detalle | `detalle[]` con productos del inventario | Sin detalle, solo `descripcion` libre |
| Flujo SUNAT | Puede quedar en `PENDIENTE` si hay relleno | Siempre va directo a `ENVIADO` |
| Campo `nota_credito` en listado | Objeto anidado completo | No aparece |
| Campo `nota_credito` en endpoint propio | — | Viene fuera del objeto serializado |
| Fechas | Solo `fecha` (datetime de registro) | `fecha_inicio`, `fecha_fin` + `fecha` de registro |
| Cliente en response | Incluye `saldo_total` y todos los campos | Solo `id`, `nombre`, `telefono`, `email` |
| URLs SUNAT cuando no aplica | Strings vacíos `""` | `null` |
| Tipos de nota de crédito | `01`, `06`, `07`, `09` | Solo `01` y `09` |
| Filtro `trabajador` | Sí (`?trabajador=<user_id>`) | No disponible |
| Filtro `metodo_pago` | Sí | No disponible |
| Permisos DELETE | `IsWorkerOrAdminOrOwner` | `IsWorkerOrAdminOrOwner` |
