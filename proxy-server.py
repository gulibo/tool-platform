#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
华为云OCR代理服务器 - Python版本
解决浏览器CORS跨域问题
使用方法: python proxy-server.py
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.error
import ssl
import os

PORT = 18766

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_POST(self):
        path = self.path
        
        # 华为云Token代理接口
        if path == '/api/huawei/token':
            print('收到华为云Token请求，转发到华为云...')
            self._proxy_huawei_token()
            return
        
        # 华为云OCR识别代理接口
        if path.startswith('/api/huawei/ocr/'):
            project_id = path.replace('/api/huawei/ocr/', '')
            print(f'收到OCR识别请求，项目ID: {project_id}')
            self._proxy_huawei_ocr(project_id)
            return
        
        # 其他POST请求返回404
        self.send_response(404)
        self.end_headers()
        self.wfile.write(b'Not Found')
    
    def _proxy_huawei_token(self):
        try:
            # 读取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            # 创建请求
            req = urllib.request.Request(
                'https://iam.cn-north-4.myhuaweicloud.com/v3/auth/tokens',
                data=body,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                method='POST'
            )
            
            # 发送请求（忽略SSL验证）
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            with urllib.request.urlopen(req, context=ctx) as response:
                # 获取响应
                response_body = response.read()
                token = response.headers.get('X-Subject-Token')
                
                # 发送响应
                self.send_response(response.status)
                if token:
                    self.send_header('X-Subject-Token', token)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(response_body)
                print(f'华为云Token响应: {response.status}')
        
        except urllib.error.HTTPError as e:
            print(f'华为云Token请求失败: {e.code}')
            self.send_response(e.code)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            print(f'代理请求失败: {e}')
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({'error': '代理请求失败', 'message': str(e)}).encode())
    
    def _proxy_huawei_ocr(self, project_id):
        try:
            # 获取认证Token
            auth_token = self.headers.get('X-Auth-Token')
            if not auth_token:
                self.send_response(401)
                self.end_headers()
                self.wfile.write(json.dumps({'error': '缺少认证Token'}).encode())
                return
            
            # 读取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            # 创建请求
            req = urllib.request.Request(
                f'https://ocr.cn-north-4.myhuaweicloud.com/v2/{project_id}/ocr/general-text',
                data=body,
                headers={
                    'Content-Type': 'application/json',
                    'X-Auth-Token': auth_token
                },
                method='POST'
            )
            
            # 发送请求（忽略SSL验证）
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            with urllib.request.urlopen(req, context=ctx) as response:
                response_body = response.read()
                
                self.send_response(response.status)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(response_body)
                print(f'OCR识别响应: {response.status}')
        
        except urllib.error.HTTPError as e:
            print(f'OCR识别请求失败: {e.code}')
            self.send_response(e.code)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            print(f'OCR代理请求失败: {e}')
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'OCR代理请求失败', 'message': str(e)}).encode())
    
    def translate_path(self, path):
        """重写路径翻译，确保从正确的目录提供文件"""
        # 获取当前脚本所在目录
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        # 处理根路径
        if path == '/':
            path = '/index.html'
        
        # 移除开头的/
        if path.startswith('/'):
            path = path[1:]
        
        # 组合完整路径
        return os.path.join(base_dir, path)


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
        print('=' * 60)
        print('华为云OCR代理服务器已启动 (Python版本)')
        print('=' * 60)
        print(f'访问地址: http://localhost:{PORT}')
        print('')
        print('使用方法:')
        print('1. 确保已安装Python 3')
        print('2. 运行: python proxy-server.py')
        print('3. 在浏览器中访问 http://localhost:' + str(PORT))
        print('')
        print('代理接口:')
        print('  POST /api/huawei/token    - 获取华为云Token')
        print('  POST /api/huawei/ocr/:projectId - OCR文字识别')
        print('=' * 60)
        print('按 Ctrl+C 停止服务器')
        httpd.serve_forever()
