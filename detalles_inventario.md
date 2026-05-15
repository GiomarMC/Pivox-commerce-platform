# Informe Completo de API — Inventario

## Autenticación global

Todos los endpoints requieren:
```
Authorization: Bearer <access_token>
```
Sin token → `401 Unauthorized`. Con token válido pero sin rol → `403 Forbidden`.

---

## Mapa completo de URLs

| Método | URL | Descripción | Permiso |
|---|---|---|---|
| GET | `/api/inventory/lotes/` | Listado paginado de lotes | Worker / Admin / Dueño |
| POST | `/api/inventory/lotes/` | Crear lote con productos | Solo Dueño |
| GET | `/api/inventory/lotes/{id}/` | Detalle de un lote | Worker / Admin / Dueño |
| DELETE | `/api/inventory/lotes/{id}/` | Desactivar lote (soft delete) | Solo Dueño |
| GET | `/api/inventory/productos/` | Listado de productos | Worker / Admin / Dueño |
| GET | `/api/inventory/productos/{id}/` | Detalle de un producto | Worker / Admin / Dueño |
| PATCH | `/api/inventory/productos/{id}/` | Actualizar producto | Solo Dueño |
| GET | `/api/inventory/stock/?tienda={id}` | Stock consolidado por tienda | Worker / Admin / Dueño |
| GET | `/api/inventory/catalogo/?tienda={id}` | Catálogo para punto de venta | Worker / Admin / Dueño |

---

## Enumeraciones

### UnidadMedida
| Código | Display |
|---|---|
| `NIU` | Unidad |
| `KGM` | Kilogramo |
| `MTR` | Metro |
| `LTR` | Litro |
| `BG` | Bolsa |
| `BX` | Caja |
| `MTK` | Metro cuadrado |
| `MTQ` | Metro cúbico |
| `KT` | Kit |
| `SET` | Juego |
| `PK` | Paquete |
| `TU` | Tubo |
| `PR` | Par |
| `CA` | Lata |
| `BJ` | Balde |
| `CY` | Cilindro |
| `CMT` | Centímetro lineal |
| `MMT` | Milímetro |
| `GLL` | Galón |
| `DZN` | Docena |
| `C62` | Pieza |
| `GRM` | Gramo |
| `MLT` | Mililitro |
| `FOT` | Pie |
| `ZZ` | Servicio |

### TipoAfectacionIGV
| Código | Display | Uso |
|---|---|---|
| `10` | Gravado (IGV 18%) | La mayoría de productos de ferretería |
| `20` | Exonerado | Sin IGV, por ley |
| `30` | Inafecto | Fuera del ámbito del IGV |

---

## Modelo de datos — Relaciones

```
Tienda
  └─ Lote (tiene tienda_id)
       └─ LoteProducto (tiene lote_id + producto_id)
            └─ Producto (nombre único global, código auto-generado)
```

- Un `Lote` representa una compra/ingreso de mercadería en una fecha específica
- Un `Lote` puede tener múltiples `LoteProducto` (uno por cada producto del pedido)
- Un `Producto` es global (no pertenece a ninguna tienda), pero sus cantidades y precios son por `LoteProducto`
- El inventario es FIFO: al vender, se consume primero el lote más antiguo

---

## Campos clave explicados

### En `LoteProducto`

| Campo | Tipo | Descripción |
|---|---|---|
| `cantidad_inicial` | Decimal(3) | Cantidad total recibida. No cambia nunca |
| `cantidad_actual` | Decimal(3) | Stock actual incluyendo averiados. Baja con cada venta |
| `cantidad_averiada` | Decimal(3) | Del total actual, cuánto está en mal estado |
| `cantidad_disponible` | Decimal(3) | Calculado: `cantidad_actual - cantidad_averiada` |
| `costo_total` | Decimal(2) | Costo total pagado por la cantidad del lote |
| `precio_compra` | Decimal(4) | Calculado automáticamente: `costo_total / cantidad_inicial` |
| `precio_venta_base` | Decimal(2) | Precio mínimo permitido para vender. Solo visible para Dueño |
| `precio_venta_mercado` | Decimal(2) | Precio normal de venta al público |
| `con_factura` | boolean | Si el lote fue comprado con factura (relevante para SUNAT) |
| `unidad_medida` | string | Código de unidad (NIU, KGM, MTR, etc.) |

### En `Lote`

| Campo | Tipo | Descripción |
|---|---|---|
| `fecha_llegada` | date | Fecha en que llegó la mercadería. Define el orden FIFO |
| `costo_operacion` | Decimal(2) | Gastos operativos del pedido (embalaje, etc.) |
| `costo_transporte` | Decimal(2) | Flete del pedido |
| `is_active` | boolean | Soft delete. False cuando el lote es desactivado |

### En `Producto`

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | string | Único globalmente. Se usa para buscar o crear en `get_or_create` |
| `codigo` | string | Auto-generado al crear. Formato: primeras 3 letras del nombre + 6 hex aleatorios. Ej: `CLA-A3F8C2` |
| `tipo_igv` | string | `10`, `20` o `30`. Afecta el XML de SUNAT |
| `imagen` | url/null | Imagen del producto (campo `imagen` en el response es URL absoluta o null) |
| `is_active` | boolean | Soft delete |

---

## LOTES

### `GET /api/inventory/lotes/`

#### Visibilidad por rol
- **Dueño:** ve lotes de **todas** las tiendas (no filtra por tienda)
- **Admin/Trabajador:** ve solo lotes de **sus tiendas asignadas**

#### Filtros disponibles
| Parámetro | Tipo | Descripción |
|---|---|---|
| `tienda` | integer | Filtra lotes por tienda específica |
| `ordering` | string | `id`, `-id` (default), `fecha_llegada`, `-fecha_llegada` |
| `page_size` | integer | 1–100, default 20 |
| `cursor` | string | Token de paginación (opaco, viene en `next`) |

#### Paginación (cursor-based)
```json
{
  "next": "http://localhost:8000/api/inventory/lotes/?cursor=cD0xNQ==",
  "previous": null,
  "results": [...]
}
```
Ordenación por defecto: `-id` (lotes más nuevos primero).

---

#### Response completo — Lote (para Dueño)
Incluye `precio_venta_base` en cada producto:
```json
{
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "tienda": {
        "id": 1,
        "nombre_sede": "Ferretería Kevin"
      },
      "fecha_llegada": "2026-03-05",
      "costo_operacion": "150.00",
      "costo_transporte": "80.00",
      "is_active": true,
      "productos": [
        {
          "id": 10,
          "producto": 1,
          "producto_nombre": "Clavo 2 pulgadas zinc",
          "producto_codigo": "CLA-A3F8C2",
          "unidad_medida": "KGM",
          "unidad_medida_display": "Kilogramo",
          "con_factura": true,
          "cantidad_inicial": "10.000",
          "cantidad_actual": "10.000",
          "cantidad_averiada": "0.000",
          "cantidad_disponible": "10.000",
          "costo_total": "50.00",
          "precio_compra": "5.0000",
          "precio_venta_base": "7.00",
          "precio_venta_mercado": "9.00",
          "is_active": true
        },
        {
          "id": 11,
          "producto": 2,
          "producto_nombre": "Cable eléctrico 2.5mm",
          "producto_codigo": "CAB-8442E1",
          "unidad_medida": "MTR",
          "unidad_medida_display": "Metro",
          "con_factura": false,
          "cantidad_inicial": "100.000",
          "cantidad_actual": "85.000",
          "cantidad_averiada": "5.000",
          "cantidad_disponible": "80.000",
          "costo_total": "180.00",
          "precio_compra": "1.8000",
          "precio_venta_base": "2.00",
          "precio_venta_mercado": "2.50",
          "is_active": true
        }
      ]
    }
  ]
}
```

#### Response — Lote (para Admin/Trabajador)
Idéntico pero **sin** `precio_venta_base` en cada producto:
```json
{
  "productos": [
    {
      "id": 10,
      "producto": 1,
      "producto_nombre": "Clavo 2 pulgadas zinc",
      "producto_codigo": "CLA-A3F8C2",
      "unidad_medida": "KGM",
      "unidad_medida_display": "Kilogramo",
      "con_factura": true,
      "cantidad_inicial": "10.000",
      "cantidad_actual": "10.000",
      "cantidad_averiada": "0.000",
      "cantidad_disponible": "10.000",
      "costo_total": "50.00",
      "precio_compra": "1.8000",
      "precio_venta_mercado": "9.00",
      "is_active": true
    }
  ]
}
```

---

### `GET /api/inventory/lotes/{id}/`
Detalle de un lote por su ID entero. Misma estructura que el listado. La visibilidad de `precio_venta_base` aplica igual según rol.

---

### `POST /api/inventory/lotes/` — Crear lote
**Solo Dueño.** Crea el lote y todos sus productos en una sola transacción atómica.

#### Campos del lote
| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `tienda` | integer | ✅ | ID de la tienda |
| `fecha_llegada` | `YYYY-MM-DD` | ✅ | Fecha de llegada de la mercadería |
| `costo_operacion` | decimal | ✅ | Gastos operativos del pedido |
| `costo_transporte` | decimal | ✅ | Flete del pedido |
| `productos` | array | ✅ | Al menos un producto |

#### Campos por producto en el array
| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `producto_id` | integer | Condicional | ID de producto existente. No usar con `nombre` |
| `nombre` | string | Condicional | Nombre del producto nuevo. No usar con `producto_id` |
| `unidad_medida` | string | — | Código de unidad. Default: `NIU` |
| `con_factura` | boolean | — | Si viene con factura del proveedor. Default: `true` |
| `cantidad` | decimal(3) | ✅ | Cantidad total recibida. Mínimo `0.001` |
| `cantidad_averiada` | decimal(3) | — | Cantidad en mal estado al llegar. Default: `0.000` |
| `costo_total` | decimal(2) | ✅ | Costo total pagado por esa cantidad |
| `precio_venta_base` | decimal(2) | ✅ | Precio mínimo para vender |
| `precio_venta_mercado` | decimal(2) | ✅ | Precio normal de venta |

> `precio_compra` se calcula automáticamente: `costo_total / cantidad`. No se envía en el request.

#### Request — Producto existente vendido por unidad
```json
{
  "tienda": 1,
  "fecha_llegada": "2026-03-05",
  "costo_operacion": "100.00",
  "costo_transporte": "50.00",
  "productos": [
    {
      "producto_id": 1,
      "unidad_medida": "NIU",
      "con_factura": true,
      "cantidad": "200.000",
      "cantidad_averiada": "0.000",
      "costo_total": "20.00",
      "precio_venta_base": "0.12",
      "precio_venta_mercado": "0.15"
    }
  ]
}
```

#### Request — Producto nuevo vendido por kilogramo
Si el nombre ya existe en BD, se reutiliza el mismo `Producto`. Si es nuevo, se crea:
```json
{
  "tienda": 1,
  "fecha_llegada": "2026-03-05",
  "costo_operacion": "100.00",
  "costo_transporte": "50.00",
  "productos": [
    {
      "nombre": "Alambre galvanizado",
      "unidad_medida": "KGM",
      "con_factura": false,
      "cantidad": "50.000",
      "cantidad_averiada": "2.500",
      "costo_total": "200.00",
      "precio_venta_base": "4.50",
      "precio_venta_mercado": "6.00"
    }
  ]
}
```

#### Request — Producto nuevo con averiados, vendido por metro
```json
{
  "tienda": 1,
  "fecha_llegada": "2026-03-05",
  "costo_operacion": "100.00",
  "costo_transporte": "50.00",
  "productos": [
    {
      "nombre": "Cable eléctrico 2.5mm",
      "unidad_medida": "MTR",
      "con_factura": true,
      "cantidad": "100.000",
      "cantidad_averiada": "5.000",
      "costo_total": "180.00",
      "precio_venta_base": "2.00",
      "precio_venta_mercado": "2.50"
    }
  ]
}
```

#### Request — Lote con múltiples productos mezclados
```json
{
  "tienda": 1,
  "fecha_llegada": "2026-05-01",
  "costo_operacion": "200.00",
  "costo_transporte": "120.00",
  "productos": [
    {
      "producto_id": 5,
      "unidad_medida": "NIU",
      "con_factura": true,
      "cantidad": "50.000",
      "cantidad_averiada": "0.000",
      "costo_total": "750.00",
      "precio_venta_base": "18.00",
      "precio_venta_mercado": "25.00"
    },
    {
      "nombre": "Pintura látex blanca",
      "unidad_medida": "BJ",
      "con_factura": false,
      "cantidad": "30.000",
      "cantidad_averiada": "1.000",
      "costo_total": "900.00",
      "precio_venta_base": "32.00",
      "precio_venta_mercado": "40.00"
    },
    {
      "nombre": "Thinner estándar",
      "unidad_medida": "LTR",
      "con_factura": true,
      "cantidad": "100.000",
      "cantidad_averiada": "0.000",
      "costo_total": "350.00",
      "precio_venta_base": "3.80",
      "precio_venta_mercado": "5.00"
    }
  ]
}
```

#### Response — Lote creado
El response siempre usa `LoteDetailSerializer` completo (con `precio_venta_base`), independiente del rol. HTTP `201 Created`:
```json
{
  "id": 12,
  "tienda": {
    "id": 1,
    "nombre_sede": "Ferretería Kevin"
  },
  "fecha_llegada": "2026-05-01",
  "costo_operacion": "200.00",
  "costo_transporte": "120.00",
  "is_active": true,
  "productos": [
    {
      "id": 45,
      "producto": 5,
      "producto_nombre": "Cemento Portland",
      "producto_codigo": "CEM-B12F3A",
      "unidad_medida": "NIU",
      "unidad_medida_display": "Unidad",
      "con_factura": true,
      "cantidad_inicial": "50.000",
      "cantidad_actual": "50.000",
      "cantidad_averiada": "0.000",
      "cantidad_disponible": "50.000",
      "costo_total": "750.00",
      "precio_compra": "15.0000",
      "precio_venta_base": "18.00",
      "precio_venta_mercado": "25.00",
      "is_active": true
    }
  ]
}
```

#### Validaciones al crear lote
| Regla | Error |
|---|---|
| Sin ningún producto en el array | `"Debe agregar al menos un producto al lote"` |
| `producto_id` duplicado en el mismo lote | `"No puede repetir el mismo producto en el lote"` |
| `nombre` duplicado (case-insensitive) en el mismo lote | `"No puede repetir productos con el mismo nombre"` |
| Ni `producto_id` ni `nombre` en un ítem | `"Debe proporcionar un producto"` |
| `precio_venta_mercado < precio_venta_base` | `"El precio de mercado no puede ser menor al precio base"` |
| `cantidad_averiada > cantidad` | `"La cantidad averiada no puede ser mayor a la cantidad total"` |
| `producto_id` referencia producto inexistente o inactivo | `"Producto X no existe o esta inactivo"` |
| `cantidad < 0.001` | Error de validación del campo |

---

### `DELETE /api/inventory/lotes/{id}/`
**Solo Dueño.** Soft delete: marca `is_active=False` en el lote y en todos sus `LoteProducto`.

El lote desaparece del listado (`get_queryset` filtra `is_active=True`). No se elimina físicamente de la BD.

Response: `204 No Content`.

> No hay forma de reactivar un lote desde la API. Es una operación permanente dentro de la app.

---

## PRODUCTOS

### `GET /api/inventory/productos/`
Lista todos los productos activos (`is_active=True`). Los productos son globales, no pertenecen a ninguna tienda específica.

Sin paginación. Sin filtros de búsqueda.

#### Response
```json
[
  {
    "id": 1,
    "nombre": "Clavo 2 pulgadas zinc",
    "codigo": "CLA-A3F8C2",
    "tipo_igv": "10",
    "tipo_igv_display": "Gravado (IGV 18%)",
    "imagen": "http://localhost:8000/media/productos/clavo.jpg",
    "is_active": true
  },
  {
    "id": 2,
    "nombre": "Cable eléctrico 2.5mm",
    "codigo": "CAB-8442E1",
    "tipo_igv": "10",
    "tipo_igv_display": "Gravado (IGV 18%)",
    "imagen": null,
    "is_active": true
  }
]
```

> `imagen` es una URL absoluta si existe, o `null`. El código (`codigo`) es auto-generado y de solo lectura — no se puede modificar.

---

### `GET /api/inventory/productos/{id}/`
Detalle de un producto por ID. Misma estructura que el listado.

---

### `PATCH /api/inventory/productos/{id}/`
**Solo Dueño.** Permite actualizar solo tres campos:

| Campo | Descripción |
|---|---|
| `tipo_igv` | `"10"`, `"20"` o `"30"` |
| `imagen` | Archivo de imagen (multipart/form-data) |
| `is_active` | `true` o `false` (soft delete manual) |

> No se puede cambiar `nombre` ni `codigo` desde la API.

#### Request (JSON)
```json
{
  "tipo_igv": "20"
}
```

#### Request (con imagen — multipart/form-data)
```
PATCH /api/inventory/productos/1/
Content-Type: multipart/form-data

tipo_igv=10
imagen=<archivo.jpg>
```

#### Response: producto actualizado completo.

---

## STOCK — Vista consolidada

### `GET /api/inventory/stock/?tienda={id}`

Devuelve el stock disponible agrupado por producto (sumando todos sus lotes activos). Solo incluye productos con `cantidad_disponible > 0`.

El precio mostrado es el del **lote más antiguo con stock** (FIFO).

#### Parámetro obligatorio
| Parámetro | Tipo | Descripción |
|---|---|---|
| `tienda` | integer | ✅ Requerido. ID de la tienda |

#### Control de acceso por rol
- **Dueño:** puede consultar cualquier tienda
- **Admin/Trabajador:** solo puede consultar su propia tienda. Si intenta otra → `403`

#### Response
```json
[
  {
    "producto_id": 1,
    "producto_nombre": "Clavo 2 pulgadas zinc",
    "unidad_medida": "KGM",
    "cantidad_disponible": "25.000",
    "precio_venta_mercado": "9.00"
  },
  {
    "producto_id": 2,
    "producto_nombre": "Cable eléctrico 2.5mm",
    "unidad_medida": "MTR",
    "cantidad_disponible": "80.000",
    "precio_venta_mercado": "2.50"
  }
]
```

> Este endpoint **no** incluye `precio_venta_base`, `cantidad_averiada` ni desglose por lotes. Es un resumen rápido. Para datos completos usar `/catalogo/` o `/lotes/`.

#### Errores
| Caso | Error |
|---|---|
| Sin parámetro `tienda` | `400 "El parámetro tienda es requerido"` |
| Admin/Trabajador consultando tienda ajena | `403 "No tienes acceso a esta tienda"` |

---

## CATÁLOGO — Vista para punto de venta

### `GET /api/inventory/catalogo/?tienda={id}`

Endpoint diseñado para el formulario de creación de ventas. Combina en una sola respuesta la información de producto + stock + precios + flags de factura. Soporta paginación e infinite scroll.

Solo devuelve productos con `cantidad_disponible > 0`.

Los precios `precio_venta_mercado` y `precio_venta_base` corresponden al **lote más antiguo con stock** (FIFO), que es el que se consumirá primero en la próxima venta.

#### Parámetros
| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `tienda` | integer | ✅ | ID de la tienda |
| `search` | string | — | Filtra por nombre de producto (ej: `?search=clavo`) |
| `page_size` | integer | — | 1–100, default 20 |
| `cursor` | string | — | Token de paginación (viene en `next`) |

#### Control de acceso por rol
- **Dueño:** puede consultar cualquier tienda, ve `precio_venta_base`
- **Admin/Trabajador:** solo su tienda, `precio_venta_base` viene `null`

#### Paginación
```json
{
  "next": "http://localhost:8000/api/inventory/catalogo/?tienda=1&cursor=cD0x",
  "previous": null,
  "results": [...]
}
```
Ordenación por `id` ascendente (fija, no configurable).

#### Response completo — para Dueño
```json
{
  "next": null,
  "previous": null,
  "results": [
    {
      "producto_id": 1,
      "nombre": "Clavo 2 pulgadas zinc",
      "codigo": "CLA-A3F8C2",
      "imagen": null,
      "tipo_igv": "10",
      "is_active": true,
      "unidad_medida": "KGM",
      "cantidad_disponible": "25.000",
      "cantidad_averiada": "2.000",
      "tiene_con_factura": true,
      "tiene_sin_factura": false,
      "precio_venta_mercado": "9.00",
      "precio_venta_base": "7.00"
    },
    {
      "producto_id": 2,
      "nombre": "Cable eléctrico 2.5mm",
      "codigo": "CAB-8442E1",
      "imagen": "http://localhost:8000/media/productos/cable.jpg",
      "tipo_igv": "10",
      "is_active": true,
      "unidad_medida": "MTR",
      "cantidad_disponible": "80.000",
      "cantidad_averiada": "5.000",
      "tiene_con_factura": false,
      "tiene_sin_factura": true,
      "precio_venta_mercado": "2.50",
      "precio_venta_base": "2.00"
    }
  ]
}
```

#### Response — para Admin/Trabajador
Idéntico pero `precio_venta_base` es `null`:
```json
{
  "results": [
    {
      "producto_id": 1,
      "nombre": "Clavo 2 pulgadas zinc",
      "codigo": "CLA-A3F8C2",
      "imagen": null,
      "tipo_igv": "10",
      "is_active": true,
      "unidad_medida": "KGM",
      "cantidad_disponible": "25.000",
      "cantidad_averiada": "2.000",
      "tiene_con_factura": true,
      "tiene_sin_factura": false,
      "precio_venta_mercado": "9.00",
      "precio_venta_base": null
    }
  ]
}
```

#### Descripción de campos del catálogo

| Campo | Descripción |
|---|---|
| `producto_id` | ID del producto. Usar como `producto_id` al crear una venta con FIFO |
| `nombre` | Nombre del producto |
| `codigo` | Código auto-generado (solo para mostrar) |
| `imagen` | URL absoluta de la imagen o `null` |
| `tipo_igv` | `10`, `20` o `30` (afecta XML de SUNAT) |
| `unidad_medida` | Código del lote FIFO más antiguo (la unidad en que se venderá) |
| `cantidad_disponible` | Suma total de `cantidad_actual - cantidad_averiada` de todos los lotes activos |
| `cantidad_averiada` | Suma total de `cantidad_averiada` de todos los lotes activos |
| `tiene_con_factura` | `true` si hay al menos un lote con `con_factura=true` y stock > 0 |
| `tiene_sin_factura` | `true` si hay al menos un lote con `con_factura=false` y stock > 0 |
| `precio_venta_mercado` | Precio del lote más antiguo con stock (FIFO). Es el precio sugerido de venta |
| `precio_venta_base` | Precio mínimo del lote FIFO. Solo para Dueño, `null` para otros roles |

#### Errores
| Caso | Error |
|---|---|
| Sin parámetro `tienda` | `400 "El parámetro tienda es requerido"` |
| Admin/Trabajador consultando tienda ajena | `403 "No tienes acceso a esta tienda"` |

---

## Comportamiento FIFO — explicado

Cuando se crea una venta con `producto_id`, el sistema:
1. Busca todos los `LoteProducto` activos de ese producto en la tienda
2. Los ordena por `lote__fecha_llegada` ASC (más antiguo primero), luego por `-con_factura` (prioriza los que tienen factura)
3. Descuenta stock del primero hasta agotarlo, luego pasa al siguiente
4. Si el stock total no alcanza → error `"Stock insuficiente. Disponible: X"`

El catálogo muestra los precios del lote FIFO actual, que es el que se consumirá. Si ese lote se agota y hay uno más nuevo, la próxima venta usará el precio de ese otro lote.

---

## Flags de factura — impacto en ventas SUNAT

El campo `con_factura` del `LoteProducto` es crítico para ventas SUNAT:

| Escenario | Resultado |
|---|---|
| Todos los productos de la venta tienen `con_factura=true` | La venta SUNAT se confirma automáticamente (`estado_sunat=ENVIADO`) |
| Algún producto tiene `con_factura=false` | El sistema busca un "relleno" (producto sustituto con factura del mismo monto) y queda en `estado_sunat=PENDIENTE` |

El campo `tiene_con_factura` y `tiene_sin_factura` del catálogo permite al frontend advertir al usuario antes de crear la venta si habrá necesidad de confirmar relleno.

---

## Árbol de decisión — Catálogo para crear venta

```
Al seleccionar un producto del catálogo para venta SUNAT:

tiene_con_factura = true y tiene_sin_factura = false
  └─ Sin relleno. La venta SUNAT se confirma automáticamente.

tiene_con_factura = true y tiene_sin_factura = true
  └─ Depende de qué lote FIFO tenga más stock.
     El sistema decide internamente.

tiene_con_factura = false y tiene_sin_factura = true
  └─ Habrá relleno necesario. Mostrar advertencia al usuario.
     La venta quedará en estado PENDIENTE hasta confirmar.

cantidad_averiada > 0
  └─ El producto tiene stock averiado. Puede venderse con es_averiado=true.
```

---

## Diferencias entre los 3 endpoints de consulta de stock

| Aspecto | `/lotes/` | `/stock/` | `/catalogo/` |
|---|---|---|---|
| Agrupa por | Lote (compra) | Producto | Producto |
| Paginación | Cursor-based | Sin paginación | Cursor-based |
| Muestra lotes individuales | Sí | No | No |
| `precio_venta_base` | Solo Dueño | No incluido | Solo Dueño |
| `cantidad_averiada` | Sí (por lote) | No incluido | Sí (total) |
| `con_factura` | Sí (por lote) | No incluido | `tiene_con_factura` / `tiene_sin_factura` |
| `precio_compra` | Sí | No | No |
| Filtro por tienda | `?tienda=` (opcional) | `?tienda=` (obligatorio) | `?tienda=` (obligatorio) |
| Búsqueda por nombre | No | No | `?search=` |
| Uso principal | Gestión del inventario | Resumen rápido de stock | Formulario de nueva venta |

---

## Permisos consolidados

| Acción | Worker | Admin | Dueño |
|---|---|---|---|
| Ver lotes (`GET /lotes/`) | ✅ (solo su tienda) | ✅ (solo su tienda) | ✅ (todas las tiendas) |
| Crear lote (`POST /lotes/`) | ❌ | ❌ | ✅ |
| Desactivar lote (`DELETE /lotes/{id}/`) | ❌ | ❌ | ✅ |
| Ver productos (`GET /productos/`) | ✅ | ✅ | ✅ |
| Actualizar producto (`PATCH /productos/{id}/`) | ❌ | ❌ | ✅ |
| Ver stock (`GET /stock/`) | ✅ (solo su tienda) | ✅ (solo su tienda) | ✅ (cualquier tienda) |
| Ver catálogo (`GET /catalogo/`) | ✅ (solo su tienda) | ✅ (solo su tienda) | ✅ (cualquier tienda) |
| Ver `precio_venta_base` | ❌ (campo ausente) | ❌ (campo ausente) | ✅ |

---

## Errores HTTP estándar

| Código | Cuándo ocurre |
|---|---|
| `400 Bad Request` | Validación fallida, parámetro `tienda` faltante |
| `401 Unauthorized` | Sin token o token expirado |
| `403 Forbidden` | Sin rol en la tienda, o acción no permitida para el rol |
| `404 Not Found` | ID de lote o producto no existe |
| `405 Method Not Allowed` | Método HTTP no permitido (ej: PUT en `/productos/`) |

Los errores 400 vienen como JSON:
```json
{ "detail": "El parámetro tienda es requerido." }
```
```json
{
  "productos": [
    { "non_field_errors": ["El precio de mercado no puede ser menor al precio base"] }
  ]
}
```
