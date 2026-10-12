import { NextResponse } from 'next/server';
import http from 'http';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("--> Proxy (Módulo HTTP) enviando para a porta 3333:", body);

    const dataString = JSON.stringify(body);

    // Usando o módulo http nativo do Node para evitar o fetch failed do Next.js
    const result = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 3333,
          path: '/api/connect-db',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataString),
          },
        },
        (res) => {
          let responseData = '';
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode || 500,
                body: JSON.parse(responseData),
              });
            } catch (e) {
              resolve({
                status: res.statusCode || 500,
                body: { success: false, error: responseData },
              });
            }
          });
        }
      );

      req.on('error', (err) => {
        reject(err);
      });

      req.write(dataString);
      req.end();
    });

    //@ts-ignore
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: any) {
    console.error("❌ Erro crítico no Proxy HTTP:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}