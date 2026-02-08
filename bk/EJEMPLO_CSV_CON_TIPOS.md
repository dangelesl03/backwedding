# Ejemplo de CSV con Tipos de Regalo

## Estructura del CSV

El CSV debe incluir las siguientes columnas:

1. **numero** - Número del regalo
2. **titulo** - Título/nombre del regalo
3. **descripcion** - Descripción (opcional)
4. **precio** - Precio del regalo (puede ser "Aporte libre" o un monto)
5. **categoria** - Categoría del regalo
6. **imagen_url** - URL de la imagen (opcional)
7. **imagen_local** - Ruta local de la imagen (opcional)
8. **link** - Link relacionado (opcional)
9. **tipo_regalo** - Tipo de regalo: "Ticket", "Aporte libre", o "Pago total" (opcional, se infiere del precio si no se especifica)
10. **tickets_disponibles** - Número de tickets disponibles (solo para tipo "Ticket", opcional)

## Tipos de Regalo

- **Ticket**: Regalos que tienen múltiples unidades disponibles (ej: entradas, boletos)
- **Aporte libre**: Regalos donde el usuario puede aportar cualquier cantidad (precio = 0 o "Aporte libre")
- **Pago total**: Regalos con un precio fijo que debe pagarse completamente

## Ejemplo de CSV

```csv
numero,titulo,descripcion,precio,categoria,imagen_url,imagen_local,link,tipo_regalo,tickets_disponibles
1,Noche de hospedaje,,Aporte libre,Luna de Miel,https://...,imagenes_regalos/regalo_001.jpg,,Aporte libre,
2,Wedding planner,,Aporte libre,El gran día,https://...,imagenes_regalos/regalo_002.jpg,,Aporte libre,
3,Entradas al teatro,,S/ 150.00,El gran día,https://...,imagenes_regalos/regalo_003.jpg,,Ticket,10
4,Cesto Ropa,,S/ 139.00,Nuestro hogar,https://...,imagenes_regalos/regalo_005.jpg,,Pago total,
5,Set de bowls KitchenAid,,S/ 149.00,Nuestro hogar,https://...,imagenes_regalos/regalo_006.jpg,,Pago total,
```

## Notas

- Si `tipo_regalo` no se especifica, se infiere automáticamente:
  - Si `precio` es "Aporte libre" o 0 → `tipo_regalo` = "Aporte libre"
  - Si `precio` tiene un valor numérico → `tipo_regalo` = "Pago total"
- Si `tipo_regalo` es "Ticket" y `tickets_disponibles` no se especifica, se usará 1 por defecto
- Si `tipo_regalo` es "Ticket" y `tickets_disponibles` se especifica, ese valor se usará para `available` y `total` en la base de datos
