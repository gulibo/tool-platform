/**
 * 华为云OCR代理服务器
 * 解决浏览器CORS跨域问题
 * 使用方法: node proxy-server.js
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // 华为云Token代理接口
    if (pathname === '/api/huawei/token' && req.method === 'POST') {
        console.log('收到华为云Token请求，转发到华为云...');
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const options = {
                hostname: 'iam.cn-north-4.myhuaweicloud.com',
                port: 443,
                path: '/v3/auth/tokens',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            };
            
            const proxyReq = https.request(options, (proxyRes) => {
                let data = '';
                proxyRes.on('data', chunk => data += chunk);
                proxyRes.on('end', () => {
                    // 转发Token头
                    const token = proxyRes.headers['x-subject-token'];
                    if (token) {
                        res.setHeader('X-Subject-Token', token);
                    }
                    res.writeHead(proxyRes.statusCode, proxyRes.headers);
                    res.end(data);
                    console.log('华为云Token响应:', proxyRes.statusCode);
                });
            });
            
            proxyReq.on('error', (err) => {
                console.error('代理请求失败:', err);
                res.writeHead(500);
                res.end(JSON.stringify({ error: '代理请求失败', message: err.message }));
            });
            
            proxyReq.write(body);
            proxyReq.end();
        });
        return;
    }
    
    // 华为云OCR识别代理接口
    if (pathname.startsWith('/api/huawei/ocr/') && req.method === 'POST') {
        const projectId = pathname.replace('/api/huawei/ocr/', '');
        console.log('收到OCR识别请求，项目ID:', projectId);
        
        const authToken = req.headers['x-auth-token'];
        if (!authToken) {
            res.writeHead(401);
            res.end(JSON.stringify({ error: '缺少认证Token' }));
            return;
        }
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const options = {
                hostname: 'ocr.cn-north-4.myhuaweicloud.com',
                port: 443,
                path: `/v2/${projectId}/ocr/general-text`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Token': authToken,
                    'Content-Length': Buffer.byteLength(body)
                }
            };
            
            const proxyReq = https.request(options, (proxyRes) => {
                let data = '';
                proxyRes.on('data', chunk => data += chunk);
                proxyRes.on('end', () => {
                    res.writeHead(proxyRes.statusCode, proxyRes.headers);
                    res.end(data);
                    console.log('OCR识别响应:', proxyRes.statusCode);
                });
            });
            
            proxyReq.on('error', (err) => {
                console.error('OCR代理请求失败:', err);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'OCR代理请求失败', message: err.message }));
            });
            
            proxyReq.write(body);
            proxyReq.end();
        });
        return;
    }
    
    // 静态文件服务
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(__dirname, filePath);
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('文件未找到');
            } else {
                res.writeHead(500);
                res.end('服务器错误');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('华为云OCR代理服务器已启动');
    console.log('='.repeat(60));
    console.log(`访问地址: http://localhost:${PORT}`);
    console.log('');
    console.log('使用方法:');
    console.log('1. 确保已安装Node.js');
    console.log('2. 运行: node proxy-server.js');
    console.log('3. 在浏览器中访问 http://localhost:' + PORT);
    console.log('');
    console.log('代理接口:');
    console.log('  POST /api/huawei/token    - 获取华为云Token');
    console.log('  POST /api/huawei/ocr/:projectId - OCR文字识别');
    console.log('='.repeat(60));
});
