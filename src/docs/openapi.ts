export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Fastify Integration Service API',
    version: '2.0.0',
    description: `
### Isolated Integration Service — AMS ↔ EIS Boundary Layer

Layanan middleware berkinerja tinggi berbasis **Fastify & TypeScript** yang berfungsi sebagai batas isolasi (*integration boundary*) antara **Approval Management System (AMS)** dan **External Inventory System (EIS)**.

#### Prinsip Arsitektur:
- Fastify tidak mengakses database EIS secara langsung. Semua data diambil melalui REST API EIS (Port 9000).
- Komunikasi AMS ➔ Fastify diamankan dengan **JWT A** (Issuer: \`ams\`, Audience: \`integration-service\`).
- Komunikasi Fastify ➔ EIS diamankan dengan **JWT B** (Issuer: \`integration-service\`, Audience: \`eis\`).
- Respon dari EIS dinormalisasi dan ditransformasikan ke dalam kontrak data standar yang dibutuhkan AMS.

#### Cara Menguji Endpoint Ber-otentikasi:
1. Klik tombol **Authorize** di pojok kanan atas atau gunakan dialog otentikasi.
2. Dapatkan token testing valid dengan membuka endpoint **GET /dev/tokens**.
3. Masukkan token tersebut ke dalam input Bearer Token.
4. Klik **Test Request** pada endpoint mana pun yang ingin diuji!
    `,
    contact: {
      name: 'Tim Integrasi Tiga Serangkai',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Integration Service (Port 5000)',
    },
  ],
  tags: [
    { name: 'System & Health', description: 'Pemeriksaan status server dan token helper' },
    { name: 'Purchase Orders', description: 'Integrasi Purchase Order dari EIS (Memerlukan scope integration:purchase-order:read)' },
    { name: 'Purchase Requests', description: 'Integrasi Purchase Request dari EIS (Memerlukan scope integration:purchase-request:read)' },
    { name: 'Unified Lookup', description: 'Pencarian dokumen lintas PO & PR untuk AMS' },
    { name: 'Dynamic PDF Generator', description: 'Layanan Dynamic Slip & Report PDF Generator berbasis Handlebars, XML AST, dan PDFKit (PRD Dynamic PDF Generator)' },
    { name: 'Legacy Aliases', description: 'Endpoint kompatibilitas mundur (/api/integration/...)' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System & Health'],
        summary: 'Pemeriksaan kesehatan service (Health Check)',
        description: 'Mengembalikan status service, timestamp, dan request ID aktif. Tidak memerlukan token otentikasi.',
        responses: {
          '200': {
            description: 'Layanan berjalan normal',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'Fastify Integration Service' },
                    version: { type: 'string', example: '2.0.0' },
                    timestamp: { type: 'string', format: 'date-time' },
                    request_id: { type: 'string', example: 'req_1727142000000_abc123' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/dev/tokens': {
      get: {
        tags: ['System & Health'],
        summary: 'Generate Token JWT A & B untuk Keperluan Testing',
        description: 'Menghasilkan token JWT A (AMS ➔ Fastify) dan JWT B (Fastify ➔ EIS) siap pakai beserta contoh header cURL untuk mempermudah testing.',
        responses: {
          '200': {
            description: 'Token pengujian berhasil dibuat',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/TokenHelperResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/integration/purchase-orders/{number}': {
      get: {
        tags: ['Purchase Orders'],
        summary: 'Ambil Detail Purchase Order berdasarkan Nomor / ID',
        description: 'Mengambil data PO dari EIS dan mentransformasikannya ke kontrak data yang siap dikonsumsi oleh AMS.',
        security: [{ BearerAuth: ['integration:purchase-order:read'] }],
        parameters: [
          {
            name: 'number',
            in: 'path',
            required: true,
            description: 'Nomor PO (misal: PO-2026-0001) atau ID angka',
            schema: { type: 'string', example: 'PO-2026-0001' },
          },
        ],
        responses: {
          '200': {
            description: 'Data PO berhasil ditemukan dan ditransformasikan',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PurchaseOrderResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '403': { $ref: '#/components/responses/ForbiddenError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
          '502': { $ref: '#/components/responses/BadGatewayError' },
        },
      },
    },
    '/api/v1/integration/purchase-orders': {
      get: {
        tags: ['Purchase Orders'],
        summary: 'Daftar Purchase Orders',
        description: 'Mengambil daftar PO dari EIS dengan opsi pencarian query keyword.',
        security: [{ BearerAuth: ['integration:purchase-order:read'] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: false,
            description: 'Kata kunci pencarian (nomor PO, nama vendor, dll)',
            schema: { type: 'string', example: 'Workstation' },
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1, minimum: 1 },
          },
          {
            name: 'per_page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 15, maximum: 100 },
          },
        ],
        responses: {
          '200': {
            description: 'Daftar PO berhasil diambil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer', example: 1 },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/PurchaseOrderItemContract' },
                    },
                    meta: { $ref: '#/components/schemas/ResponseMeta' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '403': { $ref: '#/components/responses/ForbiddenError' },
          '502': { $ref: '#/components/responses/BadGatewayError' },
        },
      },
    },
    '/api/v1/integration/purchase-orders/lookup': {
      get: {
        tags: ['Purchase Orders'],
        summary: 'Lookup PO untuk Autocomplete AMS',
        description: 'Endpoint ringan untuk pencarian cepat PO (digunakan oleh dropdown / autocomplete form input AMS).',
        security: [{ BearerAuth: ['integration:purchase-order:read'] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: false,
            description: 'Kata kunci pencarian nomor PO',
            schema: { type: 'string', example: 'PO-2026' },
          },
        ],
        responses: {
          '200': {
            description: 'Hasil lookup PO',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer', example: 1 },
                          document_number: { type: 'string', example: 'PO-2026-0001' },
                          title: { type: 'string', example: 'PO Pengadaan Perangkat Komputer Workstation Development' },
                          vendor_name: { type: 'string', example: 'PT Teknologi Mandiri' },
                          total_amount: { type: 'number', example: 28700000 },
                        },
                      },
                    },
                    meta: { $ref: '#/components/schemas/ResponseMeta' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/integration/purchase-orders/{id}/pdf': {
      get: {
        tags: ['Purchase Orders'],
        summary: 'Stream / Download Berkas PDF Purchase Order Asli dari EIS',
        description: 'Meneruskan streaming file binary PDF PO langsung dari EIS ke client.',
        security: [{ BearerAuth: ['integration:purchase-order:read'] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID PO di EIS',
            schema: { type: 'string', example: '1' },
          },
        ],
        responses: {
          '200': {
            description: 'File binary PDF',
            content: {
              'application/pdf': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/v1/integration/purchase-requests/{number}': {
      get: {
        tags: ['Purchase Requests'],
        summary: 'Ambil Detail Purchase Request berdasarkan Nomor / ID',
        description: 'Mengambil data PR dari EIS dan mentransformasikannya ke kontrak data yang siap dikonsumsi oleh AMS.',
        security: [{ BearerAuth: ['integration:purchase-request:read'] }],
        parameters: [
          {
            name: 'number',
            in: 'path',
            required: true,
            description: 'Nomor PR (misal: PR-2026-0001) atau ID angka',
            schema: { type: 'string', example: 'PR-2026-0001' },
          },
        ],
        responses: {
          '200': {
            description: 'Data PR berhasil ditemukan dan ditransformasikan',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PurchaseRequestResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '403': { $ref: '#/components/responses/ForbiddenError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
          '502': { $ref: '#/components/responses/BadGatewayError' },
        },
      },
    },
    '/api/v1/integration/purchase-requests': {
      get: {
        tags: ['Purchase Requests'],
        summary: 'Daftar Purchase Requests',
        description: 'Mengambil daftar PR dari EIS dengan filter pencarian kata kunci.',
        security: [{ BearerAuth: ['integration:purchase-request:read'] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: false,
            description: 'Kata kunci pencarian',
            schema: { type: 'string', example: 'Workstation' },
          },
        ],
        responses: {
          '200': {
            description: 'Daftar PR berhasil diambil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer', example: 1 },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/PurchaseRequestItemContract' },
                    },
                    meta: { $ref: '#/components/schemas/ResponseMeta' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/integration/purchase-requests/lookup': {
      get: {
        tags: ['Purchase Requests'],
        summary: 'Lookup PR untuk Autocomplete AMS',
        description: 'Pencarian cepat nomor PR untuk dropdown pemilihan dokumen di AMS.',
        security: [{ BearerAuth: ['integration:purchase-request:read'] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'PR-2026' },
          },
        ],
        responses: {
          '200': {
            description: 'Hasil lookup PR',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { type: 'object' } },
                    meta: { $ref: '#/components/schemas/ResponseMeta' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/integration/lookup': {
      get: {
        tags: ['Unified Lookup'],
        summary: 'Unified Lookup Dokumen Lintas Tipe (PO + PR)',
        description: 'Mencari dokumen secara gabungan dari Purchase Order dan Purchase Request berdasarkan query pencarian.',
        security: [{ BearerAuth: ['integration:purchase-order:read'] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: false,
            description: 'Query pencarian',
            schema: { type: 'string', example: '2026' },
          },
        ],
        responses: {
          '200': {
            description: 'Hasil pencarian terpadu',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer', example: 2 },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string', enum: ['PO', 'PR'], example: 'PO' },
                          number: { type: 'string', example: 'PO-2026-0001' },
                          title: { type: 'string', example: 'PO Pengadaan Perangkat Komputer Workstation' },
                          date: { type: 'string', example: '2026-09-14' },
                          vendor_or_dept: { type: 'string', example: 'PT Teknologi Mandiri' },
                          total_amount: { type: 'number', example: 28700000 },
                        },
                      },
                    },
                    meta: { $ref: '#/components/schemas/ResponseMeta' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/integration/document/{keyword}': {
      get: {
        tags: ['Unified Lookup'],
        summary: 'Deteksi & Ambil Dokumen Otomatis (PO atau PR)',
        description: 'Mendeteksi otomatis apakah keyword merupakan nomor PO atau PR, lalu mengambil data detail yang telah ditransformasikan untuk form pembuatan dokumen di AMS.',
        security: [{ BearerAuth: ['integration:purchase-order:read'] }],
        parameters: [
          {
            name: 'keyword',
            in: 'path',
            required: true,
            description: 'Nomor dokumen (misal: PO-2026-0001 atau PR-2026-0001)',
            schema: { type: 'string', example: 'PO-2026-0001' },
          },
        ],
        responses: {
          '200': {
            description: 'Dokumen berhasil ditemukan dan dinormalisasi untuk AMS',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Dokumen berhasil diambil dan ditransformasikan untuk AMS' },
                    data: { $ref: '#/components/schemas/PurchaseOrderContract' },
                    meta: { $ref: '#/components/schemas/ResponseMeta' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/integration/purchase-orders/{number}': {
      get: {
        tags: ['Legacy Aliases'],
        summary: '[Legacy] Purchase Order by Number',
        security: [{ BearerAuth: ['integration:purchase-order:read'] }],
        parameters: [{ name: 'number', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/integration/lookup': {
      get: {
        tags: ['Legacy Aliases'],
        summary: '[Legacy] Unified Lookup',
        security: [{ BearerAuth: ['integration:purchase-order:read'] }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/integration/document/{keyword}': {
      get: {
        tags: ['Legacy Aliases'],
        summary: '[Legacy] Get Document by Keyword',
        security: [{ BearerAuth: ['integration:purchase-order:read'] }],
        parameters: [{ name: 'keyword', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/integration/pdf/generate': {
      post: {
        tags: ['Dynamic PDF Generator'],
        summary: 'Generate PDF Dinamis dari JSON / Remote API URL / Keyword',
        description: 'Menghasilkan dokumen PDF secara dinamis dari payload JSON, atau fetching otomatis dari data_url dengan Bearer token, lalu di-bind ke template XML via Handlebars dan PDFKit.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  template_id: { type: 'string', example: 'purchase_request', description: 'ID template (purchase_request, purchase_order, payment_request, sample_prd, default_slip)' },
                  template_xml: { type: 'string', description: 'Runtime custom XML template string (opsional)' },
                  data: { type: 'object', description: 'Payload JSON transaksi langsung' },
                  data_url: { type: 'string', example: 'https://api.internal.local/transaksi/123', description: 'URL API sumber data eksternal/internal (PRD 5.1)' },
                  data_auth_token: { type: 'string', description: 'Bearer token untuk akses data_url' },
                  keyword: { type: 'string', example: 'POE-22005020', description: 'Lookup keyword dokumen EIS/dummy' },
                  format: { type: 'string', enum: ['binary', 'base64'], default: 'binary', description: 'Format balasan (binary PDF download atau JSON base64)' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'PDF Binary Stream atau Base64 Payload',
            content: {
              'application/pdf': { schema: { type: 'string', format: 'binary' } },
              'application/json': { schema: { type: 'object' } },
            },
          },
        },
      },
    },
    '/api/v1/integration/document/{keyword}/pdf': {
      get: {
        tags: ['Dynamic PDF Generator'],
        summary: 'Download / View Document PDF by Keyword',
        description: 'Mencari data dokumen berdasarkan keyword (nomor PO/PR/NPK) dan me-render PDF menggunakan template XML aktif secara runtime.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'keyword', in: 'path', required: true, schema: { type: 'string', example: 'POE-22005020' } },
          { name: 'template_id', in: 'query', schema: { type: 'string' } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['binary', 'base64'], default: 'binary' } },
        ],
        responses: {
          '200': {
            description: 'File PDF Dokumen',
            content: {
              'application/pdf': { schema: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
    },
    '/api/v1/integration/pdf/render-xml': {
      post: {
        tags: ['Dynamic PDF Generator'],
        summary: 'Render PDF Langsung dari Raw XML & JSON Data',
        description: 'Menguji render desain layout XML secara langsung tanpa perlu menyimpannya ke storage.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['xml'],
                properties: {
                  xml: { type: 'string', description: 'Struktur XML lengkap (<document>...</document>)' },
                  data: { type: 'object', description: 'Data variabel JSON untuk Handlebars binding' },
                  format: { type: 'string', enum: ['binary', 'base64'], default: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'File PDF Hasil Render',
            content: {
              'application/pdf': { schema: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
    },
    '/api/v1/integration/pdf/templates': {
      get: {
        tags: ['Dynamic PDF Generator'],
        summary: 'List Semua Template XML yang Tersedia',
        description: 'Mengembalikan daftar seluruh template XML yang tersimpan dalam storage.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Daftar template' },
        },
      },
      post: {
        tags: ['Dynamic PDF Generator'],
        summary: 'Tambah Template XML Baru',
        description: 'Menyimpan file desain template XML baru ke dalam storage runtime.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id', 'content'],
                properties: {
                  id: { type: 'string', example: 'custom_invoice' },
                  name: { type: 'string', example: 'Custom Invoice Template' },
                  category: { type: 'string', enum: ['PR', 'PO', 'NPK', 'GENERAL', 'CUSTOM'], default: 'CUSTOM' },
                  description: { type: 'string' },
                  content: { type: 'string', description: 'Isi XML template' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Template berhasil disimpan' },
        },
      },
    },
    '/api/v1/integration/pdf/templates/{templateId}': {
      get: {
        tags: ['Dynamic PDF Generator'],
        summary: 'Ambil Detail dan Konten Template XML',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'templateId', in: 'path', required: true, schema: { type: 'string', example: 'purchase_request' } }],
        responses: { '200': { description: 'Detail template' } },
      },
      put: {
        tags: ['Dynamic PDF Generator'],
        summary: 'Perbarui Konten Template XML (Runtime)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'templateId', in: 'path', required: true, schema: { type: 'string', example: 'purchase_request' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  content: { type: 'string', description: 'Isi XML baru' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Template berhasil diperbarui' } },
      },
      delete: {
        tags: ['Dynamic PDF Generator'],
        summary: 'Hapus Template XML dari Storage',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'templateId', in: 'path', required: true, schema: { type: 'string', example: 'custom_invoice' } }],
        responses: { '200': { description: 'Template berhasil dihapus' } },
      },
    },
    '/api/v1/integration/pdf/templates/{templateId}/preview': {
      post: {
        tags: ['Dynamic PDF Generator'],
        summary: 'Preview / Uji Render Template dengan Data Dummy',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'templateId', in: 'path', required: true, schema: { type: 'string', example: 'sample_prd' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'object', description: 'Data kustom untuk pengujian (opsional, jika kosong menggunakan default dummy)' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'PDF Preview',
            content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ketik atau paste token JWT A di sini. Gunakan endpoint GET /dev/tokens untuk mendapatkan token pengujian secara instan.',
      },
    },
    schemas: {
      ResponseMeta: {
        type: 'object',
        properties: {
          source: { type: 'string', example: 'eis' },
          request_id: { type: 'string', example: 'req_1727142000000_abc123' },
        },
      },
      PurchaseOrderResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { $ref: '#/components/schemas/PurchaseOrderContract' },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      PurchaseOrderContract: {
        type: 'object',
        properties: {
          document_number: { type: 'string', example: 'PO-2026-0001' },
          document_type: { type: 'string', example: 'Purchase Order' },
          po_number: { type: 'string', example: 'PO-2026-0001' },
          supplier_name: { type: 'string', example: 'PT Teknologi Mandiri' },
          supplier_code: { type: 'string', example: 'VND-001' },
          company_code: { type: 'string', example: 'TS' },
          date: { type: 'string', example: '2026-09-14' },
          status: { type: 'string', example: 'issued' },
          description: { type: 'string', example: 'PO Pengadaan Perangkat Komputer Workstation Development' },
          subtotal: { type: 'number', example: 28700000 },
          tax_rate: { type: 'number', example: 0.11 },
          tax_amount: { type: 'number', example: 3157000 },
          total_amount: { type: 'number', example: 31857000 },
          has_pdf: { type: 'boolean', example: true },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'BRG-001' },
                name: { type: 'string', example: 'Laptop Lenovo ThinkPad L14 Gen 4' },
                quantity: { type: 'number', example: 2 },
                unit: { type: 'string', example: 'Unit' },
                unit_price: { type: 'number', example: 12500000 },
                total_price: { type: 'number', example: 25000000 },
              },
            },
          },
        },
      },
      PurchaseOrderItemContract: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          po_number: { type: 'string', example: 'PO-2026-0001' },
          vendor: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'PT Teknologi Mandiri' },
            },
          },
          order_date: { type: 'string', example: '2026-09-14' },
          total_amount: { type: 'number', example: 31857000 },
          status: { type: 'string', example: 'issued' },
        },
      },
      PurchaseRequestResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { $ref: '#/components/schemas/PurchaseRequestContract' },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      PurchaseRequestContract: {
        type: 'object',
        properties: {
          document_number: { type: 'string', example: 'PR-2026-0001' },
          document_type: { type: 'string', example: 'Purchase Request' },
          department: { type: 'string', example: 'IT & Infrastructure' },
          date: { type: 'string', example: '2026-09-10' },
          status: { type: 'string', example: 'approved' },
          notes: { type: 'string', example: 'Permintaan pengadaan unit laptop tim developer baru' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item_name: { type: 'string', example: 'Laptop Lenovo ThinkPad L14' },
                quantity: { type: 'number', example: 2 },
                unit: { type: 'string', example: 'Unit' },
              },
            },
          },
        },
      },
      PurchaseRequestItemContract: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          pr_number: { type: 'string', example: 'PR-2026-0001' },
          department: { type: 'string', example: 'IT & Infrastructure' },
          request_date: { type: 'string', example: '2026-09-10' },
          status: { type: 'string', example: 'approved' },
        },
      },
      TokenHelperResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Token pengujian berhasil digenerate' },
          jwt_a_ams_to_fastify: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              issuer: { type: 'string', example: 'ams' },
              audience: { type: 'string', example: 'integration-service' },
              scopes: { type: 'array', items: { type: 'string' } },
              expires_in: { type: 'string', example: '24 hours' },
              curl_header: { type: 'string', example: 'Authorization: Bearer eyJhbGci...' },
            },
          },
          jwt_b_fastify_to_eis: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              issuer: { type: 'string', example: 'integration-service' },
              audience: { type: 'string', example: 'eis' },
              scopes: { type: 'array', items: { type: 'string' } },
              expires_in: { type: 'string', example: '15 minutes' },
            },
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Token otentikasi tidak disediakan atau tidak valid',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'UNAUTHORIZED' },
                    message: { type: 'string', example: 'Authorization header missing or invalid' },
                  },
                },
                request_id: { type: 'string', example: 'req_1727142000000_abc123' },
              },
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Token valid tetapi tidak memiliki scope yang disyaratkan',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'FORBIDDEN' },
                    message: { type: 'string', example: 'Token missing required scope: integration:purchase-order:read' },
                  },
                },
                request_id: { type: 'string', example: 'req_1727142000000_abc123' },
              },
            },
          },
        },
      },
      NotFoundError: {
        description: 'Dokumen atau resource tidak ditemukan',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'EIS_RESOURCE_NOT_FOUND' },
                    message: { type: 'string', example: 'Purchase Order tidak ditemukan di sistem EIS' },
                  },
                },
                request_id: { type: 'string', example: 'req_1727142000000_abc123' },
              },
            },
          },
        },
      },
      BadGatewayError: {
        description: 'Gagal menghubungi sistem EIS (EIS down atau network issue)',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'EIS_UNAVAILABLE' },
                    message: { type: 'string', example: 'External Inventory System (EIS) is currently unreachable' },
                  },
                },
                request_id: { type: 'string', example: 'req_1727142000000_abc123' },
              },
            },
          },
        },
      },
    },
  },
};
