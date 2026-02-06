const express = require('express');
const Gift = require('../models/Gift');
const { auth, adminAuth } = require('../middleware/auth');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { parse } = require('csv-parse/sync');

const router = express.Router();

/**
 * Endpoint para importar regalos desde una URL externa
 * POST /api/import/gifts
 * Body: { url: string, category?: string, categoryId?: number }
 */
router.post('/gifts', auth, adminAuth, async (req, res) => {
  try {
    const { url, category, categoryId } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ message: 'La URL es requerida.' });
    }

    console.log(`🔄 Iniciando importación desde: ${url}`);

    // Intentar primero buscar una API si es sinenvolturas.com
    let apiUrl = null;
    if (url.includes('sinenvolturas.com')) {
      // Si es una URL de configuración/admin, intentar diferentes endpoints
      if (url.includes('/evento/config/lista-regalos')) {
        // Extraer el ID de categoría o evento
        const catMatch = url.match(/cat\/([^\/]+)/);
        const eventMatch = url.match(/evento\/config\/lista-regalos\/cat\/([^\/]+)/);
        
        if (catMatch) {
          const catId = catMatch[1];
          // Intentar diferentes formatos de API
          apiUrl = `https://sinenvolturas.com/api/categories/${catId}/gifts`;
          console.log(`🔍 Intentando API de categoría: ${apiUrl}`);
          
          // También intentar endpoint alternativo
          const altApiUrl = `https://sinenvolturas.com/api/evento/config/lista-regalos/cat/${catId}`;
          console.log(`🔍 Intentando API alternativa: ${altApiUrl}`);
        }
      } else {
        // Intentar construir URL de API común para otras URLs
        const urlParts = url.split('/');
        const eventSlug = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];
        apiUrl = `https://sinenvolturas.com/api/events/${eventSlug}/gifts`;
        console.log(`🔍 Intentando API: ${apiUrl}`);
      }
    }

    let response;
    let data;
    let html = null;

    // Intentar primero la API si existe
    if (apiUrl) {
      try {
        const apiResponse = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': url
          }
        });
        if (apiResponse.ok) {
          const contentType = apiResponse.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            data = await apiResponse.json();
            console.log('✅ Datos obtenidos desde API');
          }
        } else {
          console.log(`⚠️ API respondió con status ${apiResponse.status}, intentando HTML...`);
        }
      } catch (e) {
        console.log('⚠️ No se pudo acceder a la API, intentando HTML...');
      }
      
      // Si hay API alternativa y la primera falló, intentar la segunda
      if (!data && url.includes('/evento/config/lista-regalos')) {
        const catMatch = url.match(/cat\/([^\/]+)/);
        if (catMatch) {
          const catId = catMatch[1];
          const altApiUrl = `https://sinenvolturas.com/api/evento/config/lista-regalos/cat/${catId}`;
          try {
            const altResponse = await fetch(altApiUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Referer': url
              }
            });
            if (altResponse.ok) {
              const contentType = altResponse.headers.get('content-type') || '';
              if (contentType.includes('application/json')) {
                data = await altResponse.json();
                console.log('✅ Datos obtenidos desde API alternativa');
              }
            }
          } catch (e) {
            console.log('⚠️ API alternativa también falló');
          }
        }
      }
    }

    // Si no se obtuvo datos de la API, hacer fetch a la URL HTML
    if (!data) {
      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
          }
        });
      } catch (error) {
        console.error('Error fetching URL:', error);
        return res.status(400).json({ 
          message: 'No se pudo acceder a la URL proporcionada.',
          error: error.message 
        });
      }

      if (!response.ok) {
        return res.status(response.status).json({ 
          message: `Error al acceder a la URL: ${response.statusText}` 
        });
      }

      const contentType = response.headers.get('content-type') || '';
      
      // Determinar el tipo de contenido
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Si es HTML, guardarlo para parsear
        html = await response.text();
        data = { html, type: 'html' };
      }
    }

    // Extraer regalos según el formato
    let gifts = [];
    if (data && !data.html && typeof data === 'object') {
      // Si tenemos datos JSON directamente
      console.log('📦 Procesando datos JSON directamente...');
      gifts = extractGiftsFromData(data, url);
      console.log(`✅ Se encontraron ${gifts.length} regalos en JSON`);
    } else if (data && data.html) {
      // Si tenemos HTML
      console.log('📄 Procesando HTML...');
      gifts = extractGiftsFromHTML(data.html, url);
      console.log(`✅ Se encontraron ${gifts.length} regalos en HTML`);
    } else if (html) {
      // Si tenemos HTML directamente
      console.log('📄 Procesando HTML directamente...');
      gifts = extractGiftsFromHTML(html, url);
      console.log(`✅ Se encontraron ${gifts.length} regalos en HTML`);
    }
    
    // Si no se encontraron regalos y es sinenvolturas.com, intentar diferentes estrategias
    if (gifts.length === 0 && url.includes('sinenvolturas.com')) {
      console.log('🔄 No se encontraron regalos, intentando estrategias adicionales...');
      
      const htmlToParse = html || (data && data.html) || '';
      if (!htmlToParse) {
        console.log('⚠️ No hay HTML disponible para parsear');
      } else {
        console.log(`📄 HTML disponible: ${htmlToParse.length} caracteres`);
        console.log('🔄 Intentando estrategias adicionales...');
        
        // Cargar cheerio para parsear HTML adicional
        const $html = cheerio.load(htmlToParse);
        
        // Estrategia 1: Buscar en el HTML por IDs o clases específicas de sinenvolturas
        const specificSelectors = [
          '[id*="gift"]',
          '[id*="regalo"]',
          '[id*="product"]',
          '[class*="gift-item"]',
          '[class*="regalo-item"]',
          '[data-gift-id]',
          '[data-product-id]'
        ];
        
        for (const selector of specificSelectors) {
          const elements = $html(selector);
          if (elements.length > 0) {
            console.log(`🔍 Encontrados ${elements.length} elementos con selector específico: ${selector}`);
            // Procesar estos elementos usando extractGiftsFromHTML
            const additionalGifts = extractGiftsFromHTML(htmlToParse, url);
            if (additionalGifts.length > 0) {
              gifts.push(...additionalGifts);
              break;
            }
          }
        }
        
        // Estrategia 2: Intentar scroll infinito/paginación
        if (url.includes('/config/lista-regalos')) {
          console.log('🔄 Esta es una página de configuración, intentando cargar todas las categorías...');
          // Para páginas de admin, podría haber múltiples categorías
          // Intentar diferentes parámetros
          const variations = [
            url + '?all=true',
            url + '?limit=1000',
            url.replace('/cat/', '/all/')
          ];
          
          for (const variantUrl of variations) {
            try {
              const variantResponse = await fetch(variantUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Referer': url
                }
              });
              if (variantResponse.ok) {
                const variantHtml = await variantResponse.text();
                const variantGifts = extractGiftsFromHTML(variantHtml, variantUrl);
                if (variantGifts.length > gifts.length) {
                  gifts = variantGifts;
                  console.log(`✅ Variante ${variantUrl} encontró ${variantGifts.length} regalos`);
                  break;
                }
              }
            } catch (e) {
              // Continuar con siguiente variante
            }
          }
        } else {
          // Para páginas normales, intentar paginación
          console.log('🔄 Intentando cargar más regalos (scroll infinito)...');
          for (let page = 2; page <= 5; page++) {
            try {
              const pageUrl = url.includes('?') ? `${url}&page=${page}` : `${url}?page=${page}`;
              const pageResponse = await fetch(pageUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Referer': url
                }
              });
              if (pageResponse.ok) {
                const pageHtml = await pageResponse.text();
                const pageGifts = extractGiftsFromHTML(pageHtml, pageUrl);
                if (pageGifts.length === 0) break; // No hay más regalos
                gifts.push(...pageGifts);
                console.log(`📦 Página ${page}: ${pageGifts.length} regalos encontrados`);
              }
            } catch (e) {
              break; // Detener si hay error
            }
          }
        }
      }
    }

    if (gifts.length === 0) {
      // Proporcionar más información de debug
      const debugInfo = {
        url: url,
        hasHtml: !!html,
        htmlLength: html ? html.length : 0,
        hasData: !!data,
        dataType: data ? typeof data : 'none',
        isSinEnvolturas: url.includes('sinenvolturas.com')
      };
      
      console.log('❌ No se encontraron regalos. Debug info:', debugInfo);
      
      return res.status(400).json({ 
        message: 'No se encontraron regalos en la URL proporcionada.',
        suggestion: 'Verifica que la URL contenga datos de regalos en formato JSON o HTML estructurado.',
        debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined
      });
    }

    console.log(`📦 Se encontraron ${gifts.length} regalos para importar`);

    // Crear regalos en la base de datos
    const results = {
      created: 0,
      skipped: 0,
      errors: []
    };

    for (const giftData of gifts) {
      try {
        // Validar datos mínimos
        if (!giftData.name) {
          results.skipped++;
          results.errors.push(`Regalo sin nombre: ${JSON.stringify(giftData)}`);
          continue;
        }
        
        // Validar y ajustar precio (mínimo 500)
        let price = parseFloat(giftData.price) || 0;
        if (price <= 0 || price < 500) {
          price = 500; // Precio mínimo
        }
        // Redondear al múltiplo de 500 más cercano
        price = Math.round(price / 500) * 500;
        giftData.price = price;

        // Preparar datos para crear
        const giftToCreate = {
          name: giftData.name.trim(),
          description: giftData.description || '',
          price: parseFloat(giftData.price),
          currency: giftData.currency || 'PEN',
          category: category || giftData.category || 'Otro',
          categoryId: categoryId || null,
          available: giftData.available || 1,
          total: giftData.total || 1,
          imageUrl: giftData.imageUrl || giftData.image || null,
          isActive: giftData.isActive !== false
        };

        // Verificar si ya existe un regalo con el mismo nombre
        const existing = await Gift.find({ category: giftToCreate.category });
        const exists = existing.some(g => g.name.toLowerCase() === giftToCreate.name.toLowerCase());

        if (exists) {
          results.skipped++;
          continue;
        }

        // Crear el regalo
        await Gift.create(giftToCreate);
        results.created++;
      } catch (error) {
        results.skipped++;
        results.errors.push(`Error creando "${giftData.name}": ${error.message}`);
        console.error(`Error creando regalo:`, error);
      }
    }

    res.json({
      message: `Importación completada: ${results.created} creados, ${results.skipped} omitidos`,
      results
    });

  } catch (error) {
    console.error('Error importando regalos:', error);
    res.status(500).json({ 
      message: 'Error en el servidor.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Función para extraer regalos de diferentes formatos de datos
 */
function extractGiftsFromData(data, sourceUrl) {
  const gifts = [];

  // Si es un objeto con HTML
  if (data.html) {
    return extractGiftsFromHTML(data.html, sourceUrl);
  }

  // Si es un array de regalos directamente
  if (Array.isArray(data)) {
    return data.map(item => normalizeGiftData(item));
  }

  // Si es un objeto con una propiedad que contiene el array
  if (data.gifts && Array.isArray(data.gifts)) {
    return data.gifts.map(item => normalizeGiftData(item));
  }

  if (data.items && Array.isArray(data.items)) {
    return data.items.map(item => normalizeGiftData(item));
  }

  if (data.products && Array.isArray(data.products)) {
    return data.products.map(item => normalizeGiftData(item));
  }

  if (data.data && Array.isArray(data.data)) {
    return data.data.map(item => normalizeGiftData(item));
  }

  // Si es un objeto único, intentar convertirlo en un array
  if (data.name || data.title) {
    return [normalizeGiftData(data)];
  }

  return [];
}

/**
 * Normalizar datos de regalo a formato estándar
 */
function normalizeGiftData(item) {
  return {
    name: item.name || item.title || item.productName || item.nombre || '',
    description: item.description || item.desc || item.descripcion || '',
    price: item.price || item.precio || item.cost || item.amount || 0,
    currency: item.currency || item.moneda || 'PEN',
    category: item.category || item.categoria || 'Otro',
    available: item.available || item.stock || item.cantidad || 1,
    total: item.total || item.stock || item.cantidad || 1,
    imageUrl: item.imageUrl || item.image || item.imagen || item.photo || item.picture || null,
    isActive: item.isActive !== false
  };
}

/**
 * Extraer regalos de HTML usando cheerio
 * Optimizado para sinenvolturas.com
 */
function extractGiftsFromHTML(html, sourceUrl) {
  const gifts = [];
  const $ = cheerio.load(html);
  
  console.log(`🔍 Analizando HTML (${html.length} caracteres)...`);
  
  // 1. Intentar encontrar datos JSON embebidos en el HTML (más común en SPAs)
  const jsonMatches = html.match(/<script[^>]*type=["']application\/json["'][^>]*>(.*?)<\/script>/gs);
  if (jsonMatches) {
    console.log(`📦 Se encontraron ${jsonMatches.length} scripts con application/json`);
    for (let i = 0; i < jsonMatches.length; i++) {
      try {
        const match = jsonMatches[i];
        const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const data = JSON.parse(jsonContent);
        console.log(`✅ Parseando JSON del script ${i + 1}...`);
        const extracted = extractGiftsFromData(data, sourceUrl);
        if (extracted.length > 0) {
          console.log(`   📦 Se encontraron ${extracted.length} regalos en este JSON`);
          gifts.push(...extracted);
        }
      } catch (e) {
        console.log(`⚠️ Error parseando JSON del script ${i + 1}: ${e.message.substring(0, 100)}`);
      }
    }
  }

  // 2. Buscar scripts con datos de React/Vue (window.__INITIAL_STATE__, __NEXT_DATA__, etc.)
  const dataPatterns = [
    { name: '__INITIAL_STATE__', pattern: /window\.__INITIAL_STATE__\s*=\s*({.*?});/s },
    { name: '__NEXT_DATA__', pattern: /window\.__NEXT_DATA__\s*=\s*({.*?});/s },
    { name: '__APOLLO_STATE__', pattern: /window\.__APOLLO_STATE__\s*=\s*({.*?});/s },
    { name: '__NEXT_DATA__ script', pattern: /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>(.*?)<\/script>/s },
    { name: 'window.__DATA__', pattern: /window\.__DATA__\s*=\s*({.*?});/s },
    { name: 'window.gifts', pattern: /window\.gifts\s*=\s*(\[.*?\]);/s },
    { name: 'window.products', pattern: /window\.products\s*=\s*(\[.*?\]);/s }
  ];

  for (const { name, pattern } of dataPatterns) {
    const match = html.match(pattern);
    if (match) {
      console.log(`🔍 Se encontró patrón: ${name}`);
      try {
        let jsonContent = match[1];
        // Limpiar si viene de un script tag
        jsonContent = jsonContent.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const data = JSON.parse(jsonContent);
        console.log(`✅ Parseando datos de ${name}...`);
        const extracted = extractGiftsFromData(data, sourceUrl);
        if (extracted.length > 0) {
          console.log(`   📦 Se encontraron ${extracted.length} regalos`);
          gifts.push(...extracted);
          break; // Si encontramos datos, usar estos
        }
      } catch (e) {
        console.log(`⚠️ Error parseando ${name}: ${e.message.substring(0, 100)}`);
      }
    }
  }

  // 3. Buscar API endpoints en el código JavaScript
  const apiMatches = html.match(/["']([^"']*\/api\/[^"']*(?:gifts?|regalos?|items?|products?|categories?)[^"']*)["']/gi);
  if (apiMatches && gifts.length === 0) {
    console.log(`🔍 Se encontraron ${apiMatches.length} posibles endpoints de API:`, apiMatches.slice(0, 5));
  }
  
  // 4. Buscar arrays de objetos directamente en scripts
  const arrayPatterns = [
    /const\s+\w+\s*=\s*(\[.*?\]);/gs,
    /let\s+\w+\s*=\s*(\[.*?\]);/gs,
    /var\s+\w+\s*=\s*(\[.*?\]);/gs,
    /gifts\s*[:=]\s*(\[.*?\])/gs,
    /products\s*[:=]\s*(\[.*?\])/gs,
    /items\s*[:=]\s*(\[.*?\])/gs
  ];
  
  for (const pattern of arrayPatterns) {
    const matches = html.match(pattern);
    if (matches) {
      for (const match of matches.slice(0, 3)) {
        try {
          const arrayMatch = match.match(/(\[.*\])/s);
          if (arrayMatch) {
            const data = JSON.parse(arrayMatch[1]);
            if (Array.isArray(data) && data.length > 0 && (data[0].name || data[0].title)) {
              console.log(`✅ Se encontró un array con ${data.length} elementos`);
              const extracted = extractGiftsFromData(data, sourceUrl);
              if (extracted.length > 0) {
                gifts.push(...extracted);
                break;
              }
            }
          }
        } catch (e) {
          // Continuar
        }
      }
      if (gifts.length > 0) break;
    }
  }
  
  // 5. Buscar datos en tablas HTML (común en páginas de admin)
  if (gifts.length === 0 && sourceUrl.includes('/config/')) {
    console.log('🔍 Buscando datos en tablas HTML...');
    const tableRows = $('table tbody tr, [class*="table"] tbody tr, [class*="list"] tr, tbody tr');
    console.log(`   📊 Se encontraron ${tableRows.length} filas en tablas`);
    
    tableRows.each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td, th');
      
      if (cells.length >= 2) {
        // Buscar nombre en diferentes celdas
        let name = '';
        for (let j = 0; j < Math.min(cells.length, 5); j++) {
          const cellText = cells.eq(j).text().trim();
          if (cellText.length > 3 && cellText.length < 100 && !cellText.match(/^\d+[.,]?\d*$/)) {
            name = cellText;
            break;
          }
        }
        
        // Si no se encontró nombre, buscar en elementos específicos
        if (!name) {
          name = $row.find('[class*="name"], [class*="title"], h1, h2, h3, h4').first().text().trim() ||
                 cells.first().text().trim();
        }
        
        // Buscar precio
        const priceText = $row.find('[class*="price"], [class*="amount"], [class*="cost"]').first().text().trim() ||
                         cells.filter((idx, el) => {
                           const text = $(el).text().trim();
                           return text.match(/[\d.,]+/) && parseFloat(text.replace(/[^\d.,]/g, '').replace(/,/g, '.')) > 0;
                         }).first().text().trim() ||
                         '';
        const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(/,/g, '.') || '0');
        
        // Buscar imagen
        const imageUrl = $row.find('img').first().attr('src') || 
                        $row.find('img').first().attr('data-src') ||
                        $row.find('[style*="background-image"]').attr('style')?.match(/url\(['"]?([^'")]+)/)?.[1] ||
                        null;
        
        if (name && name.length > 2 && name.length < 200) {
          gifts.push({
            name: name,
            description: $row.find('[class*="description"], [class*="desc"]').first().text().trim() || '',
            price: price || 100,
            imageUrl: imageUrl
          });
        }
      }
    });
    
    if (gifts.length > 0) {
      console.log(`✅ Se encontraron ${gifts.length} regalos en tabla HTML`);
    }
  }

  // 6. Parsear HTML directamente - Específico para sinenvolturas.com
  if (gifts.length === 0) {
    console.log('🔍 Intentando parsing HTML genérico...');
    // Estrategia específica para sinenvolturas.com
    if (sourceUrl.includes('sinenvolturas.com')) {
      // Buscar elementos de regalos - pueden estar en diferentes estructuras
      // Intentar múltiples selectores comunes
      const selectors = [
        '[class*="gift"]',
        '[class*="product"]',
        '[class*="item"]',
        '[class*="card"]',
        '[class*="regalo"]',
        'article',
        '[role="article"]',
        'div[class*="grid"] > div', // Items en grid
        '[class*="catalog"] > div',
        '[class*="list"] > div'
      ];

      for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          console.log(`🔍 Encontrados ${elements.length} elementos con selector: ${selector}`);
          
          elements.each((i, elem) => {
            const $elem = $(elem);
            
            // Buscar nombre/título - múltiples estrategias
            let name = '';
            const nameSelectors = [
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              '[class*="title"]',
              '[class*="name"]',
              '[class*="heading"]',
              'a[class*="title"]',
              'a[class*="name"]',
              '[data-title]',
              '[data-name]'
            ];
            
            for (const nameSel of nameSelectors) {
              const nameEl = $elem.find(nameSel).first();
              if (nameEl.length > 0) {
                name = nameEl.text().trim();
                if (name) break;
              }
            }
            
            // Si no se encontró nombre, intentar atributos
            if (!name) {
              name = $elem.attr('data-name') || 
                     $elem.attr('title') || 
                     $elem.attr('aria-label') || 
                     $elem.attr('alt') || '';
            }

            // Buscar precio - puede estar en varios formatos
            let price = 0;
            const priceSelectors = [
              '[class*="price"]',
              '[class*="cost"]',
              '[class*="amount"]',
              '[class*="precio"]',
              '[data-price]',
              '[data-amount]',
              '[data-cost]'
            ];
            
            for (const priceSel of priceSelectors) {
              const priceEl = $elem.find(priceSel).first();
              if (priceEl.length > 0) {
                const priceText = priceEl.text().trim();
                // Extraer números del texto (manejar "S/ 100", "100.00", "$100", etc.)
                const priceMatch = priceText.match(/[\d.,]+/);
                if (priceMatch) {
                  price = parseFloat(priceMatch[0].replace(/,/g, ''));
                  if (price > 0) break;
                }
              }
            }

            // Si dice "Aporte libre" o similar, usar precio 0 (se ajustará después)
            const elemText = $elem.text().toLowerCase();
            if (elemText.includes('aporte libre') || 
                elemText.includes('contribución libre') ||
                elemText.includes('libre')) {
              price = 0;
            }

            // Buscar imagen - múltiples estrategias
            let imageUrl = null;
            const imgSelectors = [
              'img[src]',
              'img[data-src]',
              'img[data-lazy-src]',
              'img[data-original]',
              '[style*="background-image"]',
              '[data-image]',
              '[data-img]'
            ];
            
            for (const imgSel of imgSelectors) {
              if (imgSel.includes('img')) {
                const img = $elem.find(imgSel).first();
                if (img.length > 0) {
                  imageUrl = img.attr('src') || 
                            img.attr('data-src') || 
                            img.attr('data-lazy-src') ||
                            img.attr('data-original');
                  if (imageUrl) break;
                }
              } else {
                // Buscar en background-image
                const bgEl = $elem.find('[style*="background-image"]').first();
                if (bgEl.length > 0) {
                  const style = bgEl.attr('style') || '';
                  const bgMatch = style.match(/url\(['"]?([^'")]+)/);
                  if (bgMatch) {
                    imageUrl = bgMatch[1];
                    break;
                  }
                }
              }
            }

            // Buscar descripción
            const description = $elem.find('[class*="description"], [class*="desc"], p').first().text().trim() || '';

            // Convertir URL relativa a absoluta
            if (imageUrl && !imageUrl.startsWith('http')) {
              try {
                const baseUrl = new URL(sourceUrl);
                if (imageUrl.startsWith('//')) {
                  imageUrl = baseUrl.protocol + imageUrl;
                } else if (imageUrl.startsWith('/')) {
                  imageUrl = baseUrl.origin + imageUrl;
                } else {
                  imageUrl = new URL(imageUrl, baseUrl.origin).href;
                }
              } catch (e) {
                // Ignorar errores de URL
              }
            }

            // Solo agregar si tiene nombre
            if (name && name.length > 2) {
              gifts.push({
                name: name,
                description: description,
                price: price || 100, // Precio por defecto si no se encuentra
                imageUrl: imageUrl
              });
            }
          });
          
          // Si encontramos regalos con este selector, usar estos
          if (gifts.length > 0) {
            console.log(`✅ Se encontraron ${gifts.length} regalos usando selector: ${selector}`);
            break;
          }
        }
      }
    } else {
      // Estrategia genérica para otros sitios
      $('[class*="gift"], [class*="product"], [class*="item"], [class*="card"]').each((i, elem) => {
        const $elem = $(elem);
        
        const name = $elem.find('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"]').first().text().trim() ||
                     $elem.find('a[class*="title"], a[class*="name"]').first().text().trim() ||
                     $elem.attr('data-name') || 
                     $elem.attr('title') || 
                     $elem.attr('aria-label') || '';

        let price = 0;
        const priceText = $elem.find('[class*="price"], [class*="cost"]').first().text();
        if (priceText) {
          const priceMatch = priceText.match(/[\d.,]+/);
          if (priceMatch) {
            price = parseFloat(priceMatch[0].replace(/,/g, ''));
          }
        }

        let imageUrl = $elem.find('img').first().attr('src') || 
                       $elem.find('img').first().attr('data-src') || null;

        if (imageUrl && !imageUrl.startsWith('http')) {
          try {
            const baseUrl = new URL(sourceUrl);
            imageUrl = new URL(imageUrl, baseUrl.origin).href;
          } catch (e) {}
        }

        if (name) {
          gifts.push({
            name: name,
            description: $elem.find('p').first().text().trim() || '',
            price: price || 100,
            imageUrl: imageUrl
          });
        }
      });
    }

    // Si aún no hay resultados, buscar en estructuras más genéricas
    if (gifts.length === 0) {
      console.log('🔍 Buscando en estructuras genéricas...');
      // Buscar en elementos article, div con clases comunes
      const genericElements = $('article, div[class*="card"], div[class*="item"], div[class*="product"], div[class*="gift"]');
      console.log(`   📦 Se encontraron ${genericElements.length} elementos genéricos`);
      
      genericElements.each((i, elem) => {
        const $elem = $(elem);
        const name = $elem.find('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"]').first().text().trim();
        const img = $elem.find('img').first();
        
        if (name && name.length > 2 && name.length < 200) {
          let imageUrl = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || null;
          if (imageUrl && !imageUrl.startsWith('http')) {
            try {
              const baseUrl = new URL(sourceUrl);
              imageUrl = new URL(imageUrl, baseUrl.origin).href;
            } catch (e) {}
          }
          
          // Buscar precio
          const priceText = $elem.find('[class*="price"], [class*="amount"]').first().text();
          const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(/,/g, '.') || '100');
          
          gifts.push({
            name: name,
            description: $elem.find('p, [class*="description"]').first().text().trim() || '',
            price: price || 100,
            imageUrl: imageUrl
          });
        }
      });
      
      if (gifts.length > 0) {
        console.log(`✅ Se encontraron ${gifts.length} regalos en estructuras genéricas`);
      }
    }
  }

  console.log(`📊 Total de regalos encontrados: ${gifts.length}`);
  return gifts;
}

/**
 * Endpoint para importar regalos desde CSV
 * POST /api/import/csv
 * Body: { csvContent: string, category?: string, categoryId?: number, baseImageUrl?: string }
 */
router.post('/csv', auth, adminAuth, async (req, res) => {
  try {
    const { csvContent, category, categoryId, baseImageUrl } = req.body;

    if (!csvContent || !csvContent.trim()) {
      return res.status(400).json({ message: 'El contenido del CSV es requerido.' });
    }

    console.log('🔄 Iniciando importación desde CSV...');

    // Parsear CSV
    let records;
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });
    } catch (error) {
      console.error('Error parseando CSV:', error);
      return res.status(400).json({ 
        message: 'Error al parsear el CSV.',
        error: error.message 
      });
    }

    if (!records || records.length === 0) {
      return res.status(400).json({ message: 'El CSV no contiene datos válidos.' });
    }

    console.log(`📦 Se encontraron ${records.length} registros en el CSV`);

    // Procesar cada registro
    const results = {
      created: 0,
      skipped: 0,
      errors: []
    };

    for (const record of records) {
      try {
        // Extraer datos del registro (manejar diferentes nombres de columnas)
        const name = record.titulo || record.title || record.nombre || record.name || '';
        const price = parseFloat(record.precio || record.price || record.cost || '0');
        const imageLocal = record.imagen_local || record.imagen || record.image || record.image_local || '';
        
        // Validar datos mínimos
        if (!name || name.trim().length === 0) {
          results.skipped++;
          results.errors.push(`Registro sin nombre: ${JSON.stringify(record)}`);
          continue;
        }

        if (!price || price <= 0) {
          results.skipped++;
          results.errors.push(`Regalo "${name}" sin precio válido`);
          continue;
        }

        // Construir URL de imagen
        let imageUrl = null;
        if (imageLocal && imageLocal.trim()) {
          // Si la imagen es relativa, construir URL pública
          if (imageLocal.startsWith('http')) {
            imageUrl = imageLocal; // URL absoluta
          } else {
            // Ruta relativa: convertir a URL pública
            // El CSV tiene rutas como "imagenes_regalos/regalo_001.jpg"
            // Necesitamos convertirlas a "/images/imagenes_regalos/regalo_001.jpg"
            let imagePath = imageLocal.trim();
            
            // Si no empieza con /, agregarlo
            if (!imagePath.startsWith('/')) {
              imagePath = `/${imagePath}`;
            }
            
            // Si ya incluye "images/", usar tal cual, sino agregar "images/"
            if (imagePath.includes('/images/')) {
              imageUrl = imagePath;
            } else if (imagePath.includes('imagenes_regalos')) {
              // Si tiene imagenes_regalos, asegurar que tenga /images/ antes
              imageUrl = `/images${imagePath}`;
            } else {
              // Para otras rutas, usar baseImageUrl o /images/
              imageUrl = baseImageUrl ? `${baseImageUrl}${imagePath}` : `/images${imagePath}`;
            }
          }
        }

        // Preparar datos para crear
        const giftToCreate = {
          name: name.trim(),
          description: record.descripcion || record.description || record.desc || '',
          price: price,
          currency: 'PEN',
          category: category || record.categoria || record.category || 'Otro',
          categoryId: categoryId || null,
          available: parseInt(record.available || record.disponible || record.stock || '1'),
          total: parseInt(record.total || record.cantidad || record.stock || '1'),
          imageUrl: imageUrl,
          isActive: true
        };

        // Verificar si ya existe un regalo con el mismo nombre
        const existing = await Gift.find({ category: giftToCreate.category });
        const exists = existing.some(g => g.name.toLowerCase() === giftToCreate.name.toLowerCase());

        if (exists) {
          results.skipped++;
          continue;
        }

        // Crear el regalo
        await Gift.create(giftToCreate);
        results.created++;
        console.log(`✅ Creado: ${giftToCreate.name} - S/ ${giftToCreate.price}`);
      } catch (error) {
        results.skipped++;
        results.errors.push(`Error creando "${record.titulo || record.title || 'regalo'}": ${error.message}`);
        console.error(`Error creando regalo:`, error);
      }
    }

    res.json({
      message: `Importación desde CSV completada: ${results.created} creados, ${results.skipped} omitidos`,
      results
    });

  } catch (error) {
    console.error('Error importando desde CSV:', error);
    res.status(500).json({ 
      message: 'Error en el servidor.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
