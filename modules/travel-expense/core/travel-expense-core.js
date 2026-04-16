/**
 * 差旅费报销工具 - 核心处理逻辑
 * 功能：OCR识别、PDF解析、XML解析、信息提取、文件匹配、文档生成
 * 作者：AI Assistant
 * 版本：2.0.0 - 支持华为云OCR
 */

(function() {
    'use strict';

    // 核心处理器
    const TravelExpenseCore = {
        // 全局状态
        files: [],
        results: {
            invoices: [], // 所有发票信息
            payments: [], // 付款记录
            travelDocs: [], // 出差相关文档
            caseDocs: [], // 案件相关文档
            extractedInfo: {} // 提取的关键信息
        },
        
        // OCR配置 - 从StateManager加载管理员配置
        ocrConfig: {
            provider: 'tesseract',
            huawei: {
                endpoint: 'ocr.cn-north-4.myhuaweicloud.com',
                ak: '',
                sk: '',
                projectId: ''
            }
        },
        
        // 加载管理员配置（从StateManager）
        loadAdminConfig: async function() {
            try {
                console.log('加载管理员OCR配置...');
                console.log('StateManager是否存在:', typeof StateManager !== 'undefined');
                
                // 从StateManager获取OCR配置
                if (typeof StateManager !== 'undefined' && StateManager.state) {
                    // 强制从localStorage重新加载，确保获取最新配置
                    const saved = localStorage.getItem('tool_platform_v7');
                    if (saved) {
                        try {
                            const loadedState = JSON.parse(saved);
                            if (loadedState.ocrConfig) {
                                console.log('从localStorage直接读取OCR配置:', loadedState.ocrConfig);
                                StateManager.state.ocrConfig = loadedState.ocrConfig;
                            }
                        } catch (e) {
                            console.log('从localStorage读取失败:', e);
                        }
                    }
                    
                    const config = StateManager.get('ocrConfig');
                    console.log('从StateManager获取到的OCR配置:', config);
                    
                    if (config && config.provider) {
                        console.log('从StateManager加载到OCR配置:', config);
                        
                        this.ocrConfig.provider = config.provider;
                        
                        if (config.huawei) {
                            this.ocrConfig.huawei = {
                                ...this.ocrConfig.huawei,
                                ...config.huawei
                            };
                        }
                        console.log('OCR配置已加载，提供商:', this.ocrConfig.provider);
                        console.log('华为云配置:', {
                            hasAK: !!this.ocrConfig.huawei.ak,
                            hasSK: !!this.ocrConfig.huawei.sk,
                            projectId: this.ocrConfig.huawei.projectId,
                            accountType: this.ocrConfig.huawei.accountType
                        });
                        return;
                    } else {
                        console.log('StateManager中没有OCR配置，尝试从配置文件加载...');
                    }
                } else {
                    console.log('StateManager未定义，尝试从配置文件加载...');
                }
                
                // 备用：从配置文件加载
                try {
                    const response = await fetch('./modules/travel-expense/config/ocr-config.json');
                    if (response.ok) {
                        const config = await response.json();
                        console.log('从配置文件加载到OCR配置:', config);
                        
                        if (config.provider) {
                            this.ocrConfig.provider = config.provider;
                        }
                        if (config.huawei) {
                            this.ocrConfig.huawei = {
                                ...this.ocrConfig.huawei,
                                ...config.huawei
                            };
                        }
                        console.log('OCR配置已加载，提供商:', this.ocrConfig.provider);
                    } else {
                        console.log('配置文件不存在，使用默认配置(tesseract)');
                    }
                } catch (fetchError) {
                    console.log('读取配置文件失败，使用默认配置:', fetchError.message);
                }
            } catch (error) {
                console.error('加载OCR配置失败，使用默认配置:', error);
            }
        },
        
        // 设置OCR提供商（仅用于调试，生产环境应从配置文件读取）
        setOCRProvider: function(provider, config) {
            this.ocrConfig.provider = provider;
            if (config) {
                Object.assign(this.ocrConfig[provider], config);
            }
            console.log('OCR提供商设置为:', provider);
        },
        
        // 初始化Tesseract Worker
        initTesseractWorker: async function() {
            if (typeof Tesseract === 'undefined') {
                console.log('加载Tesseract.js...');
                await this.loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.0.3/dist/tesseract.min.js');
            }
            
            if (!this.tesseractWorker) {
                console.log('创建Tesseract Worker...');
                try {
                    this.tesseractWorker = await Promise.race([
                        Tesseract.createWorker('chi_sim'),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('OCR初始化超时')), 60000)
                        )
                    ]);
                    console.log('Tesseract Worker创建成功');
                } catch (error) {
                    console.error('Tesseract初始化失败:', error);
                    throw error;
                }
            }
        },
        
        // 初始化OCR
        initOCR: async function() {
            console.log('开始初始化OCR，提供商:', this.ocrConfig.provider);
            
            if (this.ocrConfig.provider === 'tesseract') {
                // 本地Tesseract OCR
                await this.initTesseractWorker();
            } else if (this.ocrConfig.provider === 'huawei') {
                // 华为云OCR - 检查配置
                if (!this.ocrConfig.huawei.ak || !this.ocrConfig.huawei.sk) {
                    console.warn('华为云OCR未配置AK/SK，将使用Tesseract作为备选');
                    this.ocrConfig.provider = 'tesseract';
                    await this.initTesseractWorker();
                }
                // 华为云OCR模式下也预初始化Tesseract作为备选
                else {
                    console.log('华为云OCR模式下预初始化Tesseract作为备选...');
                    this.initTesseractWorker().catch(err => {
                        console.log('Tesseract备选初始化失败（非关键）:', err.message);
                    });
                }
            }
        },
        
        // 动态加载脚本
        loadScript: function(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        },
        
        // 处理文件
        processFiles: async function(files) {
            console.log('开始处理文件:', files.length, '个文件');
            this.files = files;
            this.results = {
                invoices: [],
                payments: [],
                travelDocs: [],
                caseDocs: [],
                extractedInfo: {}
            };
            
            // 分类处理文件
            const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
            const xmlFiles = files.filter(f => f.name.toLowerCase().endsWith('.xml'));
            const imageFiles = files.filter(f => f.type.startsWith('image/'));
            
            console.log('PDF文件:', pdfFiles.length, '个');
            console.log('XML文件:', xmlFiles.length, '个');
            console.log('图片文件:', imageFiles.length, '个');
            
            // 处理PDF文件
            for (const file of pdfFiles) {
                try {
                    if (file.name.includes('立案报告')) {
                        this.results.caseDocs.push(await this.processPDF(file, 'case'));
                    } else {
                        this.results.invoices.push(await this.processPDF(file, 'invoice'));
                    }
                } catch (error) {
                    console.error('处理PDF文件失败:', file.name, error);
                }
            }
            
            // 处理XML文件
            for (const file of xmlFiles) {
                try {
                    this.results.invoices.push(await this.processXML(file));
                } catch (error) {
                    console.error('处理XML文件失败:', file.name, error);
                }
            }
            
            // 处理图片文件（带超时机制）
            for (const file of imageFiles) {
                try {
                    const result = await Promise.race([
                        this.processImage(file),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('OCR处理超时')), 30000)
                        )
                    ]);
                    console.log('图片处理结果:', file.name, '类型:', result.type, '数据:', result.data);
                    
                    // 首先根据文件名判断文档类型
                    const fileName = file.name.toLowerCase();
                    const docTypeByName = this.determineDocTypeByFileName(fileName);
                    console.log('根据文件名判断的类型:', docTypeByName);
                    
                    if (result.type === 'payment') {
                        this.results.payments.push(result.data);
                    } else if (docTypeByName === 'outingApproval') {
                        // 外出办案审批表
                        this.results.travelDocs.push({
                            ...result.data,
                            type: 'outingApproval',
                            source: 'image',
                            fileName: file.name
                        });
                    } else if (docTypeByName === 'travelApproval') {
                        // 出差审批单
                        this.results.travelDocs.push({
                            ...result.data,
                            type: 'travelApproval',
                            source: 'image',
                            fileName: file.name
                        });
                    } else if (docTypeByName === 'carRental') {
                        // 租车结算单
                        this.results.travelDocs.push({
                            ...result.data,
                            type: 'carRental',
                            source: 'image',
                            fileName: file.name
                        });
                    } else if (docTypeByName === 'caseDocument') {
                        // 立案报告表
                        this.results.caseDocs.push({
                            ...result.data,
                            type: 'caseDocument',
                            source: 'image',
                            fileName: file.name
                        });
                    } else if (result.type === 'travel') {
                        // 合并到travelDocs，但要保持数据结构一致
                        this.results.travelDocs.push({
                            ...result.data,
                            source: 'image',
                            fileName: file.name
                        });
                    } else if (result.type === 'case') {
                        this.results.caseDocs.push({
                            ...result.data,
                            source: 'image',
                            fileName: file.name
                        });
                    }
                } catch (error) {
                    console.error('处理图片文件失败:', file.name, error);
                }
            }
            
            // 匹配发票和支付记录
            this.matchInvoicesAndPayments();
            
            // 提取关键信息
            this.extractKeyInformation();
            
            console.log('文件处理完成');
            return this.results;
        },
        
        // 处理PDF文件
        processPDF: async function(file, type) {
            if (typeof pdfjsLib === 'undefined') {
                await this.loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
            }
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + '\n';
            }
            
            if (type === 'case') {
                return this.extractCaseInfoFromPDF(fullText);
            } else {
                return this.extractInvoiceInfoFromPDF(fullText, file.name);
            }
        },
        
        // 处理XML文件
        processXML: async function(file) {
            const text = await file.text();
            return this.extractInvoiceInfoFromXML(text, file.name);
        },
        
        // 处理图片文件
        processImage: async function(file) {
            await this.initOCR();
            
            let text = '';
            
            if (this.ocrConfig.provider === 'huawei' && this.ocrConfig.huawei.ak) {
                // 使用华为云OCR
                console.log('使用华为云OCR识别...');
                try {
                    text = await this.recognizeWithHuaweiOCR(file);
                    console.log('华为云OCR识别成功');
                } catch (error) {
                    console.error('华为云OCR失败，切换到Tesseract:', error);
                    // 失败后使用Tesseract - 确保Worker已初始化
                    if (!this.tesseractWorker) {
                        console.log('初始化Tesseract作为备选...');
                        await this.initTesseractWorker();
                    }
                    const imageData = await this.fileToImageData(file);
                    const result = await this.tesseractWorker.recognize(imageData);
                    text = result.data.text;
                }
            } else {
                // 使用本地Tesseract OCR
                console.log('使用Tesseract OCR识别...');
                if (!this.tesseractWorker) {
                    await this.initTesseractWorker();
                }
                const imageData = await this.fileToImageData(file);
                const result = await this.tesseractWorker.recognize(imageData);
                text = result.data.text;
            }
            
            console.log('原始OCR识别结果:', text.substring(0, 200));
            
            // 应用OCR后处理校正
            text = this.postProcessOCR(text);
            
            const imageType = this.determineImageType(text);
            // 传递文件名参数，以便根据文件名判断文档类型
            const extractedData = this.extractInfoByType(text, imageType, file.name);
            
            // 确保返回的数据包含type字段
            return {
                type: imageType,
                data: {
                    ...extractedData,
                    type: extractedData.type || imageType
                }
            };
        },
        
        // 华为云OCR识别
        recognizeWithHuaweiOCR: async function(file) {
            const config = this.ocrConfig.huawei;
            
            // 1. 获取Token
            const token = await this.getHuaweiToken(config);
            
            // 2. 读取图片为Base64
            const base64Image = await this.fileToBase64(file);
            
            // 3. 调用OCR API（使用代理服务器避免CORS）
            const response = await fetch(`/api/huawei/ocr/${config.projectId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Token': token
                },
                body: JSON.stringify({
                    image: base64Image
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(`华为云OCR请求失败: ${JSON.stringify(error)}`);
            }
            
            const result = await response.json();
            
            // 4. 提取文字
            let text = '';
            if (result.result && result.result.words_block_list) {
                text = result.result.words_block_list.map(block => block.words).join('\n');
            }
            
            return text;
        },
        
        // 获取华为云Token - 使用代理服务器避免CORS
        getHuaweiToken: async function(config) {
            console.log('开始获取华为云Token...');
            console.log('账号类型:', config.accountType || 'main');
            
            // 构建请求体
            let requestBody;
            
            if (config.accountType === 'iam') {
                // IAM用户密码认证（AK填IAM用户名，SK填密码）
                requestBody = {
                    auth: {
                        identity: {
                            methods: ['password'],
                            password: {
                                user: {
                                    name: config.ak,  // IAM用户名
                                    password: config.sk,  // IAM用户密码
                                    domain: {
                                        name: config.domain  // 主账号名
                                    }
                                }
                            }
                        },
                        scope: {
                            project: {
                                id: config.projectId
                            }
                        }
                    }
                };
            } else {
                // 主账号访问密钥认证
                requestBody = {
                    auth: {
                        identity: {
                            methods: ['hw_access_key'],
                            hw_access_key: {
                                access: {
                                    key: config.ak,
                                    secret: config.sk
                                }
                            }
                        },
                        scope: {
                            project: {
                                id: config.projectId
                            }
                        }
                    }
                };
            }
            
            console.log('请求Token，项目ID:', config.projectId);
            
            // 使用代理服务器避免CORS问题
            const response = await fetch('/api/huawei/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('获取Token失败:', response.status, errorText);
                throw new Error(`获取华为云Token失败: ${response.status} - ${errorText}`);
            }
            
            const token = response.headers.get('X-Subject-Token');
            console.log('成功获取Token:', token ? 'Token已获取' : 'Token为空');
            return token;
        },
        
        // 文件转Base64
        fileToBase64: function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },
        
        // 文件转ImageData（带预处理）
        fileToImageData: function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        
                        // 应用图像预处理以提高OCR准确率
                        const processedCanvas = this.preprocessImage(canvas);
                        resolve(processedCanvas);
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },
        
        // 图像预处理：去噪、二值化、锐化
        preprocessImage: function(canvas) {
            const width = canvas.width;
            const height = canvas.height;
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            // 创建新的canvas用于输出
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = width;
            outputCanvas.height = height;
            const outputCtx = outputCanvas.getContext('2d');
            const outputImageData = outputCtx.createImageData(width, height);
            const outputData = outputImageData.data;
            
            // 步骤1: 灰度化
            const grayData = new Uint8ClampedArray(width * height);
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                grayData[i / 4] = gray;
            }
            
            // 步骤2: 自适应阈值二值化（Otsu算法简化版）
            const threshold = this.calculateOtsuThreshold(grayData);
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    const gray = grayData[y * width + x];
                    
                    // 二值化
                    const binary = gray > threshold ? 255 : 0;
                    
                    outputData[idx] = binary;
                    outputData[idx + 1] = binary;
                    outputData[idx + 2] = binary;
                    outputData[idx + 3] = 255;
                }
            }
            
            outputCtx.putImageData(outputImageData, 0, 0);
            console.log('图像预处理完成，阈值:', threshold);
            return outputCanvas;
        },
        
        // Otsu阈值计算
        calculateOtsuThreshold: function(grayData) {
            const histogram = new Array(256).fill(0);
            const total = grayData.length;
            
            // 计算直方图
            for (let i = 0; i < total; i++) {
                histogram[Math.floor(grayData[i])]++;
            }
            
            let sum = 0;
            for (let i = 0; i < 256; i++) {
                sum += i * histogram[i];
            }
            
            let sumB = 0;
            let wB = 0;
            let wF = 0;
            let maxVariance = 0;
            let threshold = 0;
            
            for (let t = 0; t < 256; t++) {
                wB += histogram[t];
                if (wB === 0) continue;
                
                wF = total - wB;
                if (wF === 0) break;
                
                sumB += t * histogram[t];
                
                const mB = sumB / wB;
                const mF = (sum - sumB) / wF;
                
                const variance = wB * wF * (mB - mF) * (mB - mF);
                
                if (variance > maxVariance) {
                    maxVariance = variance;
                    threshold = t;
                }
            }
            
            return threshold;
        },
        
        // OCR后处理：校正常见错误
        postProcessOCR: function(text) {
            console.log('OCR后处理前:', text.substring(0, 200));
            
            let corrected = text;
            
            // 常见OCR错误校正词典
            const corrections = {
                // 地名校正
                '瞧阳': '睢阳',
                '瞧阳区': '睢阳区',
                '幅城': '虞城',
                '康城': '虞城',
                '广城': '虞城',
                '眶城': '虞城',
                '江浙': '江浙',
                '公允': '公安',
                
                // 单位名称校正
                '烟卓': '烟草',
                '烟卖': '烟草',
                '专买': '专卖',
                '局执法': '局执法',
                '昌一体化': '示范区',
                
                // 常用词校正
                '本昌': '本案',
                '当呈人': '当事人',
                '美呈': '美国庆',
                '美国庆': '美国庆',
                '美 国 庆': '美国庆',
                '法 定': '法定',
                '代表人': '代表人',
                '身份 证': '身份证',
                '和信站': '和信街',
                
                // 案件相关
                '立 案': '立案',
                '报 告': '报告',
                '案 件': '案件',
                '来 源': '来源',
                '举 报': '举报',
                '投 诉': '投诉',
                '涉 嫌': '涉嫌',
                '无 证': '无证',
                '生 产': '生产',
                '卷 烟': '卷烟',
                '滤 嘴': '滤嘴',
                '烟 草': '烟草',
                '专 用': '专用',
                '机 械': '机械',
                '违 法': '违法',
                '行 为': '行为',
                '执 法': '执法',
                '人 员': '人员',
                '现 场': '现场',
                '查 获': '查获',
                '设 备': '设备',
                '公 斤': '公斤',
                '许 可': '许可',
                '登 记': '登记',
                '保 存': '保存',
                
                // 人名校正（常见姓氏）
                '李圭': '李奎',
                '刘饥': '刘凯',
                '于坤': '于坤',
                '李志友': '李志友',
                '胡汝友': '胡汝友',
                '李壮壮': '李壮壮',
                
                // 其他常见错误
                '低 调': '低调',
                '半 型': '半型',
                '省 内': '省内',
                '市 区': '市区',
                '儿 出': '儿出',
                '出 兰': '出兰',
                '志 反': '志反',
                '日 期': '日期',
                '行 业': '行业',
                '人 员': '人员',
                'yi 人': '外人',
                'yi人员': '外人员',
                'y i': '外',
            };
            
            // 应用校正
            for (const [wrong, right] of Object.entries(corrections)) {
                const regex = new RegExp(wrong.replace(/\s+/g, '\\s*'), 'g');
                corrected = corrected.replace(regex, right);
            }
            
            // 移除多余的空格（中文之间）
            corrected = corrected.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2');
            
            console.log('OCR后处理后:', corrected.substring(0, 200));
            return corrected;
        },
        
        // 提取PDF发票信息
        extractInvoiceInfoFromPDF: function(text, fileName) {
            const info = {
                source: 'pdf',
                fileName: fileName,
                invoiceNumber: '',
                sellerName: '',
                itemName: '',
                totalAmount: '',
                remarks: '',
                issueDate: '',
                type: ''
            };
            
            // 发票号码
            const numberMatch = text.match(/发票号码[：:]\s*([\d]+)/) ||
                                text.match(/号码[：:]\s*([\d]+)/) ||
                                text.match(/No[.:]?\s*([\d]+)/i);
            if (numberMatch) info.invoiceNumber = numberMatch[1];
            
            // 销售方
            const sellerMatch = text.match(/销售方[名称]*[：:]\s*([^\n]+)/) ||
                                text.match(/销方[名称]*[：:]\s*([^\n]+)/);
            if (sellerMatch) info.sellerName = sellerMatch[1].trim();
            
            // 金额
            const amountMatch = text.match(/合计金额[：:]\s*([\d,.]+)/) ||
                                text.match(/金额[：:]\s*([\d,.]+)/) ||
                                text.match(/¥\s*([\d,.]+)/);
            if (amountMatch) info.totalAmount = amountMatch[1].replace(/,/g, '');
            
            // 开票日期
            const dateMatch = text.match(/开票日期[：:]\s*(\d{4}[年/-]\d{1,2}[月/-]\d{1,2}[日]?)/) ||
                              text.match(/日期[：:]\s*(\d{4}[年/-]\d{1,2}[月/-]\d{1,2}[日]?)/);
            if (dateMatch) info.issueDate = dateMatch[1];
            
            // 项目名称
            const itemMatch = text.match(/项目名称[：:]\s*([^\n]+)/) ||
                             text.match(/货物或应税劳务、服务名称[：:]\s*([^\n]+)/);
            if (itemMatch) info.itemName = itemMatch[1].trim();
            
            // 备注
            const remarksMatch = text.match(/备注[：:]\s*([^\n]+)/);
            if (remarksMatch) info.remarks = remarksMatch[1].trim();
            
            // 判断发票类型
            if (text.includes('铁路') || text.includes('高铁') || text.includes('车票')) {
                info.type = '高铁票';
            } else if (text.includes('加油') || text.includes('汽油') || text.includes('柴油')) {
                info.type = '燃油费';
            } else if (text.includes('通行') || text.includes('高速') || text.includes('过路费')) {
                info.type = '过路费';
            } else if (text.includes('住宿') || text.includes('酒店')) {
                info.type = '住宿费';
            } else if (text.includes('租赁') || text.includes('租车')) {
                info.type = '租车费';
            }
            
            return info;
        },
        
        // 提取XML发票信息
        extractInvoiceInfoFromXML: function(xmlText, fileName) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            const info = {
                source: 'xml',
                fileName: fileName,
                invoiceNumber: '',
                sellerName: '',
                itemName: '',
                totalAmount: '',
                remarks: '',
                issueDate: '',
                type: ''
            };
            
            // 发票号码（从EIid提取）
            const eiid = this.getXMLValue(xmlDoc, '//EIid');
            if (eiid) info.invoiceNumber = eiid;
            
            // 销售方
            info.sellerName = this.getXMLValue(xmlDoc, '//SellerName');
            
            // 金额
            info.totalAmount = this.getXMLValue(xmlDoc, '//TotalTax-includedAmount');
            
            // 开票日期
            info.issueDate = this.getXMLValue(xmlDoc, '//IssueTime') || this.getXMLValue(xmlDoc, '//RequestTime');
            
            // 项目名称
            info.itemName = this.getXMLValue(xmlDoc, '//ItemName');
            
            // 判断发票类型
            if (info.itemName.includes('运输服务') || info.itemName.includes('票价')) {
                info.type = '高铁票';
            } else if (info.itemName.includes('加油') || info.sellerName.includes('石油') || info.sellerName.includes('石化')) {
                info.type = '燃油费';
            } else if (info.itemName.includes('通行') || info.itemName.includes('过路费')) {
                info.type = '过路费';
            } else if (info.itemName.includes('住宿') || info.itemName.includes('酒店')) {
                info.type = '住宿费';
            } else if (info.itemName.includes('租赁') || info.itemName.includes('租车')) {
                info.type = '租车费';
            }
            
            return info;
        },
        
        // 提取立案报告信息
        extractCaseInfoFromPDF: function(text) {
            console.log('从PDF提取立案报告信息');
            
            const info = {
                type: 'caseDocument',
                caseNumber: '',
                caseName: '',
                caseDate: ''
            };
            
            // 案件编号（格式：商睢烟立[2026]第016号 → 提取为：商睢烟[2026]第016号）
            const caseNumberMatch = text.match(/立案报告表[\s\S]*?(商睢烟立\[\d{4}\]第\d+号)/) ||
                                   text.match(/(商睢烟立\[\d{4}\]第\d+号)/);
            if (caseNumberMatch) {
                info.caseNumber = caseNumberMatch[1].replace('立', '');
                console.log('提取到案件编号:', info.caseNumber);
            }
            
            // 案件名称
            const caseNameMatch = text.match(/案件名称[：:]\s*([^\n]+)/);
            if (caseNameMatch) info.caseName = caseNameMatch[1].trim();
            
            // 立案日期
            const dateMatch = text.match(/立案日期[：:]\s*(\d{4}[年/-]\d{1,2}[月/-]\d{1,2}[日]?)/);
            if (dateMatch) info.caseDate = dateMatch[1];
            
            console.log('立案报告信息:', info);
            return info;
        },
        
        // 获取XML节点值
        getXMLValue: function(xmlDoc, xpath) {
            try {
                const result = xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.STRING_TYPE, null);
                return result.stringValue || '';
            } catch (e) {
                return '';
            }
        },
        
        // 根据文件名判断文档类型
        determineDocTypeByFileName: function(fileName) {
            console.log('根据文件名判断类型:', fileName);
            
            // 立案报告表
            if (fileName.includes('立案') || fileName.includes('案件报告')) {
                return 'caseDocument';
            }
            
            // 外出办案审批表
            if (fileName.includes('外出') && fileName.includes('办案')) {
                return 'outingApproval';
            }
            
            // 出差审批单
            if (fileName.includes('出差') && (fileName.includes('审批') || fileName.includes('申请'))) {
                return 'travelApproval';
            }
            
            // 租车结算单
            if (fileName.includes('租车') || (fileName.includes('结算') && fileName.includes('车'))) {
                return 'carRental';
            }
            
            // 支付记录
            if (fileName.includes('支付') || fileName.includes('付款') || fileName.includes('转账')) {
                return 'payment';
            }
            
            return 'unknown';
        },
        
        // 判断图片类型
        determineImageType: function(text) {
            const lowerText = text.toLowerCase();
            console.log('判断图片类型，文本:', lowerText.substring(0, 100));
            
            // 优先检查支付记录（特征最明显）
            if (lowerText.includes('支付') || lowerText.includes('付款') || 
                lowerText.includes('转账') || lowerText.includes('交易成功') ||
                lowerText.includes('支付宝') || lowerText.includes('微信支付') ||
                lowerText.includes('收款方') || lowerText.includes('商户全称') ||
                lowerText.includes('交易金额') || lowerText.includes('支付时间')) {
                console.log('识别为：支付记录');
                return 'payment';
            }
            
            // 检查出差相关文档
            if ((lowerText.includes('出差') && lowerText.includes('审批')) || 
                (lowerText.includes('外出') && lowerText.includes('办案')) ||
                (lowerText.includes('人员') && lowerText.includes('地点')) ||
                lowerText.includes('租车') || lowerText.includes('结算单')) {
                console.log('识别为：出差文档');
                return 'travel';
            }
            
            // 检查案件相关文档
            if (lowerText.includes('立案') || lowerText.includes('案件') || 
                lowerText.includes('当事人') || lowerText.includes('案件性质') ||
                lowerText.includes('违法') || lowerText.includes('立案报告')) {
                console.log('识别为：案件文档');
                return 'case';
            }
            
            console.log('识别为：未知类型');
            return 'unknown';
        },
        
        // 根据类型提取信息
        extractInfoByType: function(text, type, fileName) {
            // 首先根据文件名判断文档类型
            const docTypeByName = fileName ? this.determineDocTypeByFileName(fileName.toLowerCase()) : 'unknown';
            console.log('extractInfoByType - 文件名:', fileName, '判断类型:', docTypeByName);
            
            // 如果文件名能确定类型，使用文件名判断的类型
            if (docTypeByName !== 'unknown' && docTypeByName !== 'payment') {
                switch (docTypeByName) {
                    case 'outingApproval':
                        return this.extractOutingApprovalInfo(text);
                    case 'travelApproval':
                        return this.extractTravelApprovalInfo(text);
                    case 'carRental':
                        return this.extractCarRentalInfo(text);
                    case 'caseDocument':
                        return this.extractCaseDocumentInfo(text);
                    default:
                        break;
                }
            }
            
            // 否则使用OCR判断的类型
            switch (type) {
                case 'payment':
                    return this.extractPaymentInfo(text);
                case 'travel':
                    return this.extractTravelInfo(text);
                case 'case':
                    return this.extractCaseInfo(text);
                default:
                    return { rawText: text };
            }
        },
        
        // 提取付款信息
        extractPaymentInfo: function(text) {
            const info = {
                payee: '',
                amount: '',
                payTime: '',
                payMethod: ''
            };
            
            const payeeMatch = text.match(/收款方[：:]\s*([^\n]+)/) || 
                               text.match(/商家名称[：:]\s*([^\n]+)/) ||
                               text.match(/对方账户[：:]\s*([^\n]+)/);
            if (payeeMatch) info.payee = payeeMatch[1].trim();
            
            const amountMatch = text.match(/金额[：:]\s*([\d,.]+)/) ||
                                text.match(/付款金额[：:]\s*([\d,.]+)/) ||
                                text.match(/¥\s*([\d,.]+)/);
            if (amountMatch) info.amount = amountMatch[1].replace(/,/g, '');
            
            const timeMatch = text.match(/(\d{4}[年/-]\d{1,2}[月/-]\d{1,2}[日]?\s*\d{1,2}[：:]\d{2})/) ||
                              text.match(/创建时间[：:]\s*([^\n]+)/);
            if (timeMatch) info.payTime = timeMatch[1];
            
            if (text.includes('支付宝')) info.payMethod = '支付宝';
            else if (text.includes('微信支付') || text.includes('微信')) info.payMethod = '微信支付';
            else if (text.includes('银行')) info.payMethod = '银行卡';
            
            return info;
        },
        
        // 提取出差信息
        extractTravelInfo: function(text) {
            console.log('提取出差信息，文本长度:', text.length);
            console.log('文本前300字符:', text.substring(0, 300));
            
            // 判断文档类型 - 使用更宽松的匹配
            const lowerText = text.toLowerCase();
            
            // 1. 外出办案审批表 - 宽松匹配
            const isOutingApproval = (lowerText.includes('外出') && lowerText.includes('办案')) || 
                                     lowerText.includes('外出办案') ||
                                     (lowerText.includes('办案') && lowerText.includes('审批') && lowerText.includes('地点'));
            
            // 2. 出差审批单 - 宽松匹配
            const isTravelApproval = (lowerText.includes('出差') && lowerText.includes('审批')) ||
                                     lowerText.includes('出差申请') ||
                                     (lowerText.includes('出差') && (lowerText.includes('人员') || lowerText.includes('日期')));
            
            // 3. 租车结算单 - 宽松匹配
            const isCarRental = lowerText.includes('租车') ||
                                (lowerText.includes('结算') && lowerText.includes('车牌')) ||
                                (lowerText.includes('车辆') && lowerText.includes('租赁'));
            
            console.log('文档类型判断:', { isOutingApproval, isTravelApproval, isCarRental });
            
            // 根据类型调用专门的提取函数
            if (isOutingApproval) {
                console.log('识别为：外出办案审批表，调用专门提取函数');
                return this.extractOutingApprovalInfo(text);
            } else if (isTravelApproval) {
                console.log('识别为：出差审批单，调用专门提取函数');
                return this.extractTravelApprovalInfo(text);
            } else if (isCarRental) {
                console.log('识别为：租车结算单，调用专门提取函数');
                return this.extractCarRentalInfo(text);
            }
            
            // 如果无法识别类型，返回空对象
            console.log('无法识别出差文档类型');
            return { type: 'unknown', rawText: text };
        },
        
        // 专门提取外出办案审批表信息
        extractOutingApprovalInfo: function(text) {
            console.log('专门提取外出办案审批表信息');
            console.log('OCR文本长度:', text.length);
            console.log('OCR完整文本:');
            console.log(text);
            console.log('---OCR文本结束---');
            
            const info = {
                type: 'outingApproval',
                caseName: '',
                location: '',
                jointUnit: '',
                caseDescription: '',
                onSiteInfo: ''
            };
            
            // 案件名称 - 多策略提取
            console.log('=== 开始提取案件名称 ===');
            // 策略1: 查找"本案"后面的内容（可能是表格格式）
            const casePatterns = [
                /本\s*[案昌]\s*[:：]?\s*([^\n]{2,100}?)(?=案件来源|来源|举报|投诉|时间|$)/i,
                /案\s*件\s*名\s*称\s*[:：]?\s*([^\n]{2,100})/i,
                /案\s*由\s*[:：]?\s*([^\n]{2,100})/i,
                /涉\s*嫌\s*([^\n]{2,100}?)(?=案件来源|来源|举报|投诉|时间|$)/i,
                // 新增：匹配案件情况/案情后面的内容作为案件名称
                /案\s*件\s*情\s*况\s*[:：]?\s*([^\n。]{5,200})/i,
                /查\s*获\s*([^\n。]{5,100})/i,
                /现\s*场\s*抓\s*获\s*([^\n。]{5,100})/i
            ];
            
            for (const pattern of casePatterns) {
                const match = text.match(pattern);
                if (match) {
                    info.caseName = match[1].trim();
                    console.log('提取到案件名称:', info.caseName);
                    break;
                }
            }
            
            // 如果还是没有提取到，尝试提取前100个字符作为案件名称
            if (!info.caseName && text.length > 10) {
                const firstLine = text.split(/[\n。]/)[0].trim();
                if (firstLine.length > 5 && firstLine.length < 100) {
                    info.caseName = firstLine;
                    console.log('使用第一行作为案件名称:', info.caseName);
                }
            }
            
            if (!info.caseName) {
                console.log('未能匹配案件名称');
            }
            
            // 办案地点 - 多策略提取
            console.log('=== 开始提取办案地点 ===');
            const locationPatterns = [
                /前\s*往\s*地\s*点\s*[:：]?\s*([^\n]{2,100})/i,
                /办\s*案\s*地\s*点\s*[:：]?\s*([^\n]{2,100})/i,
                /目\s*的\s*地\s*[:：]?\s*([^\n]{2,100})/i,
                /地\s*点[:：]?\s*([^\n]{2,100}?)(?=时间|日期|人员|$)/i
            ];
            
            for (const pattern of locationPatterns) {
                const match = text.match(pattern);
                if (match) {
                    info.location = match[1].trim();
                    console.log('提取到办案地点:', info.location);
                    break;
                }
            }
            
            if (!info.location) {
                console.log('未能匹配办案地点');
            }
            
            // 联合办案单位 - 多策略提取
            console.log('=== 开始提取联合办案单位 ===');
            const jointUnitPatterns = [
                /联\s*合\s*办\s*案\s*单\s*位\s*[:：]?\s*([^\n]{2,100})/i,
                /联\s*合\s*单\s*位\s*[:：]?\s*([^\n]{2,100})/i,
                /协\s*办\s*单\s*位\s*[:：]?\s*([^\n]{2,100})/i,
                /配\s*合\s*单\s*位\s*[:：]?\s*([^\n]{2,100})/i
            ];
            
            for (const pattern of jointUnitPatterns) {
                const match = text.match(pattern);
                if (match) {
                    info.jointUnit = match[1].trim();
                    console.log('提取到联合办案单位:', info.jointUnit);
                    break;
                }
            }
            
            if (!info.jointUnit) {
                console.log('未能匹配联合办案单位');
            }
            
            // 案件情况 - 多策略提取
            console.log('=== 开始提取案件情况 ===');
            const caseDescPatterns = [
                /案\s*件\s*情\s*况\s*[:：]?\s*([\s\S]{10,500}?)(?=当场查获|查获|违法|当事人|申请人|时间|地点|联合|$)/i,
                /案\s*情\s*[:：]?\s*([\s\S]{10,500}?)(?=当场查获|查获|违法|当事人|申请人|时间|地点|联合|$)/i,
                /情\s*况\s*说\s*明\s*[:：]?\s*([\s\S]{10,500}?)(?=当场查获|查获|违法|当事人|申请人|时间|地点|联合|$)/i
            ];
            
            for (const pattern of caseDescPatterns) {
                const match = text.match(pattern);
                if (match) {
                    info.caseDescription = match[1].trim();
                    console.log('提取到案件情况:', info.caseDescription.substring(0, 100));
                    break;
                }
            }
            
            if (!info.caseDescription) {
                console.log('未能匹配案件情况');
            }
            
            // 当场查获信息 - 更宽松的匹配
            const onSiteMatch = text.match(/当场查获\s*([\s\S]{5,300}?)(?=通过查证|经查证|申请人|时间)/i) ||
                               text.match(/查获\s*([\s\S]{5,300}?)(?=通过|经查|当事人)/i);
            if (onSiteMatch) {
                info.onSiteInfo = onSiteMatch[1].trim();
                console.log('提取到当场查获信息:', info.onSiteInfo.substring(0, 100));
            }
            
            console.log('外出办案审批表提取结果:', info);
            return info;
        },
        
        // 专门提取出差审批单信息
        extractTravelApprovalInfo: function(text) {
            console.log('专门提取出差审批单信息');
            console.log('OCR文本长度:', text.length);
            console.log('OCR完整文本:');
            console.log(text);
            console.log('---OCR文本结束---');
            
            const info = {
                type: 'travelApproval',
                travelers: [],
                externalPersonnel: [],
                startDate: '',
                endDate: '',
                destinations: [],
                description: ''
            };
            
            // 出差人 - 智能提取和清理
            console.log('=== 开始提取出差人 ===');
            const travelersPatterns = [
                /出\s*差\s*人\s*[:：]?\s*([^\n]{2,100}?)(?=行\s*业\s*外|人\s*员|时\s*间|地\s*点|$)/i,
                /人\s*员\s*[:：]?\s*([^\n]{2,100}?)(?=行\s*业\s*外|时\s*间|地\s*点|$)/i
            ];
            
            for (const pattern of travelersPatterns) {
                const match = text.match(pattern);
                if (match) {
                    let rawNames = match[1].trim();
                    console.log('原始出差人文本:', rawNames);
                    
                    // 清理OCR噪声：只保留中文字符和分隔符
                    rawNames = rawNames.replace(/[^\u4e00-\u9fa5,，、\s]/g, '');
                    
                    // 分割人名
                    let names = rawNames.split(/[,，、\s]+/).filter(s => s && s.length >= 2 && s.length <= 4);
                    
                    // 过滤掉非人名的词（如"行业外人员"、"日期"等）
                    const invalidWords = ['行业', '人员', '日期', '时间', '地点', '出差', '审批', '申请', '低调'];
                    names = names.filter(name => {
                        // 检查是否包含无效词
                        for (const word of invalidWords) {
                            if (name.includes(word)) return false;
                        }
                        // 检查是否是常见姓氏开头
                        const commonSurnames = ['李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧', '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕', '苏', '卢', '蒋', '蔡', '贾', '丁', '魏', '薛', '叶', '阎', '余', '潘', '杜', '戴', '夏', '钟', '汪', '田', '任', '姜', '范', '方', '石', '姚', '谭', '廖', '邹', '熊', '金', '陆', '郝', '孔', '白', '崔', '康', '毛', '邱', '秦', '江', '史', '顾', '侯', '邵', '孟', '龙', '万', '段', '雷', '钱', '汤', '尹', '黎', '易', '常', '武', '乔', '贺', '赖', '龚', '文', '于', '胡'];
                        const firstChar = name.charAt(0);
                        return commonSurnames.includes(firstChar);
                    });
                    
                    info.travelers = names;
                    console.log('提取到出差人(清理后):', info.travelers);
                    break;
                }
            }
            
            if (info.travelers.length === 0) {
                console.log('未能匹配出差人');
            }
            
            // 行业外人员 - 支持OCR识别误差
            const externalIndex = text.search(/行\s*业\s*外\s*人\s*员|外\s*单\s*位|外\s*部\s*人\s*员|协\s*作\s*人\s*员/i);
            console.log('行业外人员关键词位置:', externalIndex);
            if (externalIndex >= 0) {
                const afterKeyword = text.substring(externalIndex, externalIndex + 300);
                console.log('行业外人员后300字符:', afterKeyword);
                let match = afterKeyword.match(/[:：]\s*([^\n]{2,100})/);
                if (!match) {
                    const afterName = afterKeyword.replace(/行\s*业\s*外\s*人\s*员|外\s*单\s*位|外\s*部\s*人\s*员|协\s*作\s*人\s*员\s*/, '').trim();
                    const lines = afterName.split('\n').filter(line => line.trim());
                    if (lines.length > 0) {
                        info.externalPersonnel = lines[0].split(/[,，、]/).map(s => s.trim()).filter(s => s);
                        console.log('提取到行业外人员(无冒号):', info.externalPersonnel);
                    }
                } else {
                    info.externalPersonnel = match[1].split(/[,，、]/).map(s => s.trim()).filter(s => s);
                    console.log('提取到行业外人员:', info.externalPersonnel);
                }
            }
            
            // 出差日期 - 支持OCR识别误差（空格分隔的日期）
            const datePattern = /(\d{4})\s*[年/\-\.]\s*(\d{1,2})\s*[月/\-\.]\s*(\d{1,2})\s*[日]?[\s]*[-~至到]+[\s]*(\d{4})\s*[年/\-\.]\s*(\d{1,2})\s*[月/\-\.]\s*(\d{1,2})\s*[日]?/;
            const dateMatch = text.match(datePattern);
            if (dateMatch) {
                info.startDate = `${dateMatch[1]}年${dateMatch[2]}月${dateMatch[3]}日`;
                info.endDate = `${dateMatch[4]}年${dateMatch[5]}月${dateMatch[6]}日`;
                console.log('提取到出差日期:', info.startDate, '至', info.endDate);
            } else {
                // 尝试单独查找日期（支持空格分隔）
                const singleDatePattern = /(\d{4})\s*[年/\-\.]\s*(\d{1,2})\s*[月/\-\.]\s*(\d{1,2})\s*[日]?/g;
                const dates = [];
                let m;
                while ((m = singleDatePattern.exec(text)) !== null) {
                    dates.push(`${m[1]}年${m[2]}月${m[3]}日`);
                }
                if (dates.length >= 2) {
                    info.startDate = dates[0];
                    info.endDate = dates[dates.length - 1];
                    console.log('从多个日期中提取:', info.startDate, '至', info.endDate);
                }
            }
            
            // 到达地 - 支持OCR识别误差
            const destIndex = text.search(/到\s*达\s*地|目\s*的\s*地|出\s*差\s*地\s*点/i);
            console.log('到达地关键词位置:', destIndex);
            if (destIndex >= 0) {
                const afterKeyword = text.substring(destIndex, destIndex + 300);
                console.log('到达地后300字符:', afterKeyword);
                let match = afterKeyword.match(/[:：]\s*([^\n]{2,100})/);
                if (!match) {
                    const afterName = afterKeyword.replace(/到\s*达\s*地|目\s*的\s*地|出\s*差\s*地\s*点\s*/, '').trim();
                    const lines = afterName.split('\n').filter(line => line.trim());
                    if (lines.length > 0) {
                        info.destinations = lines[0].split(/[,，、]/).map(s => s.trim()).filter(s => s);
                        console.log('提取到到达地(无冒号):', info.destinations);
                    }
                } else {
                    info.destinations = match[1].split(/[,，、]/).map(s => s.trim()).filter(s => s);
                    console.log('提取到到达地:', info.destinations);
                }
            }
            
            // 申请说明 - 支持OCR识别误差
            const descIndex = text.search(/申\s*请\s*说\s*明|说\s*明|事\s*由|出\s*差\s*事\s*由/i);
            console.log('申请说明关键词位置:', descIndex);
            if (descIndex >= 0) {
                const afterKeyword = text.substring(descIndex, descIndex + 800);
                console.log('申请说明后400字符:', afterKeyword.substring(0, 400));
                const match = afterKeyword.match(/[:：]\s*([\s\S]{5,400}?)(?=申请人|日期|时间|$)/i);
                if (match) {
                    info.description = match[1].trim();
                    console.log('提取到申请说明:', info.description.substring(0, 100));
                }
            }
            
            console.log('出差审批单提取结果:', info);
            return info;
        },
        
        // 专门提取租车结算单信息
        extractCarRentalInfo: function(text) {
            console.log('专门提取租车结算单信息');
            console.log('OCR文本长度:', text.length);
            console.log('OCR完整文本:');
            console.log(text);
            console.log('---OCR文本结束---');
            
            const info = {
                type: 'carRental',
                plateNumber: '',
                pickUpTime: '',
                returnTime: '',
                carInfo: '',
                totalAmount: ''
            };
            
            // 车牌号码 - 支持OCR识别误差（空格分隔）
            const plateIndex = text.search(/车\s*牌\s*号\s*码|车\s*牌\s*号|车\s*牌/i);
            console.log('车牌号码关键词位置:', plateIndex);
            if (plateIndex >= 0) {
                const afterKeyword = text.substring(plateIndex, plateIndex + 150);
                console.log('车牌号码后150字符:', afterKeyword);
                // 尝试匹配冒号后的内容，或直接匹配车牌格式（支持空格）
                let match = afterKeyword.match(/[:：]\s*([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼]\s*[A-Z]\s*[A-Z0-9\s]{4,8})/);
                if (match) {
                    // 清理空格
                    info.plateNumber = match[1].replace(/\s+/g, '');
                    console.log('提取到车牌号码(清理空格后):', info.plateNumber);
                }
                if (!match) {
                    // 尝试在整个文本中匹配车牌（支持空格）
                    match = text.match(/([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼]\s*[A-Z]\s*[A-Z0-9\s]{4,8})/);
                    if (match) {
                        info.plateNumber = match[1].replace(/\s+/g, '');
                        console.log('从全文提取到车牌号码:', info.plateNumber);
                    }
                }
            }
            
            // 取车时间 - 支持OCR识别误差（空格分隔的日期）
            const pickUpIndex = text.search(/取\s*车\s*时\s*间|取\s*车\s*日\s*期|开\s*始\s*时\s*间/i);
            console.log('取车时间关键词位置:', pickUpIndex);
            if (pickUpIndex >= 0) {
                const afterKeyword = text.substring(pickUpIndex, pickUpIndex + 150);
                console.log('取车时间后150字符:', afterKeyword);
                // 支持空格分隔的日期格式
                const match = afterKeyword.match(/[:：]\s*(\d{4})\s*[年/\-\.]\s*(\d{1,2})\s*[月/\-\.]\s*(\d{1,2})\s*[日]?/) ||
                             afterKeyword.match(/(\d{4})\s*[年/\-\.]\s*(\d{1,2})\s*[月/\-\.]\s*(\d{1,2})\s*[日]?/);
                if (match) {
                    info.pickUpTime = `${match[1]}年${match[2]}月${match[3]}日`;
                    console.log('提取到取车时间:', info.pickUpTime);
                }
            }
            
            // 还车时间 - 支持OCR识别误差（空格分隔的日期）
            const returnIndex = text.search(/还\s*车\s*时\s*间|还\s*车\s*日\s*期|结\s*束\s*时\s*间/i);
            console.log('还车时间关键词位置:', returnIndex);
            if (returnIndex >= 0) {
                const afterKeyword = text.substring(returnIndex, returnIndex + 150);
                console.log('还车时间后150字符:', afterKeyword);
                const match = afterKeyword.match(/[:：]\s*(\d{4})\s*[年/\-\.]\s*(\d{1,2})\s*[月/\-\.]\s*(\d{1,2})\s*[日]?/) ||
                             afterKeyword.match(/(\d{4})\s*[年/\-\.]\s*(\d{1,2})\s*[月/\-\.]\s*(\d{1,2})\s*[日]?/);
                if (match) {
                    info.returnTime = `${match[1]}年${match[2]}月${match[3]}日`;
                    console.log('提取到还车时间:', info.returnTime);
                }
            }
            
            // 车辆信息 - 支持OCR识别误差
            const carInfoIndex = text.search(/车\s*辆\s*信\s*息|车\s*型|车\s*辆\s*型\s*号|品\s*牌\s*车\s*型/i);
            console.log('车辆信息关键词位置:', carInfoIndex);
            if (carInfoIndex >= 0) {
                const afterKeyword = text.substring(carInfoIndex, carInfoIndex + 300);
                console.log('车辆信息后300字符:', afterKeyword);
                let match = afterKeyword.match(/[:：]\s*([^\n]{2,100})/);
                if (!match) {
                    const afterName = afterKeyword.replace(/车\s*辆\s*信\s*息|车\s*型|车\s*辆\s*型\s*号|品\s*牌\s*车\s*型\s*/, '').trim();
                    const lines = afterName.split('\n').filter(line => line.trim());
                    if (lines.length > 0 && lines[0].length > 1) {
                        info.carInfo = lines[0].trim();
                        console.log('提取到车辆信息(无冒号):', info.carInfo);
                    }
                } else {
                    info.carInfo = match[1].trim();
                    console.log('提取到车辆信息:', info.carInfo);
                }
            }
            
            // 费用总金额 - 支持OCR识别误差
            const amountIndex = text.search(/费\s*用\s*总\s*金\s*额|总\s*金\s*额|合\s*计|金\s*额|租\s*金|总\s*价/i);
            console.log('费用总金额关键词位置:', amountIndex);
            if (amountIndex >= 0) {
                const afterKeyword = text.substring(amountIndex, amountIndex + 150);
                console.log('费用总金额后150字符:', afterKeyword);
                // 匹配冒号后的数字（支持空格）
                let match = afterKeyword.match(/[:：]\s*([\d\s,.]+)/);
                if (match) {
                    info.totalAmount = match[1].replace(/[\s,]/g, '');
                    console.log('提取到费用总金额(冒号后):', info.totalAmount);
                }
                if (!match) {
                    // 尝试查找¥符号后的数字（支持空格）
                    match = afterKeyword.match(/[¥￥]\s*([\d\s,.]+)/);
                    if (match) {
                        info.totalAmount = match[1].replace(/[\s,]/g, '');
                        console.log('提取到费用总金额(¥符号后):', info.totalAmount);
                    }
                }
                if (!match) {
                    // 尝试查找任意数字（至少3位，支持空格）
                    match = afterKeyword.match(/([\d\s]{3,})/);
                    if (match) {
                        info.totalAmount = match[1].replace(/\s+/g, '');
                        console.log('提取到费用总金额(纯数字):', info.totalAmount);
                    }
                }
            }
            
            console.log('租车结算单提取结果:', info);
            return info;
        },
        
        // 专门提取立案报告表信息
        extractCaseDocumentInfo: function(text) {
            console.log('专门提取立案报告表信息');
            console.log('OCR文本前800字符:', text.substring(0, 800));
            
            const info = {
                type: 'caseDocument',
                caseNumber: '',
                caseName: '',
                caseDate: '',
                party: ''
            };
            
            // 案件编号 - 支持多种格式（包括空格和不同类型的括号）
            console.log('查找案件编号...');
            // 格式1: 商睢烟立[2026]第016号 或 商 睢 烟 立 〔2026) 第 016 号
            let caseNumberMatch = text.match(/(商\s*睢?\s*烟\s*立?\s*[\[〔]\s*\d{4}\s*[\]〕]\s*第\s*\d+\s*号)/i);
            if (caseNumberMatch) {
                // 清理空格和括号，统一格式
                info.caseNumber = caseNumberMatch[1].replace(/\s+/g, '').replace('立', '').replace('〔', '[').replace('〕', ']');
                console.log('提取到案件编号:', info.caseNumber);
            }
            
            // 如果上面的格式没匹配到，尝试更灵活的格式
            if (!info.caseNumber) {
                // 匹配类似 "烟立[2026]第016号" 或 "烟 立 〔2026〕 第 016 号"
                caseNumberMatch = text.match(/(烟\s*立?\s*[\[〔（]\s*\d{4}\s*[\]〕）]\s*第\s*\d+\s*号)/i);
                if (caseNumberMatch) {
                    info.caseNumber = caseNumberMatch[1].replace(/\s+/g, '').replace('立', '').replace('〔', '[').replace('〕', ']').replace('（', '[').replace('）', ']');
                    console.log('提取到案件编号(灵活格式):', info.caseNumber);
                }
            }
            
            // 再尝试匹配 "商烟立[年份]第XXX号" 格式
            if (!info.caseNumber) {
                caseNumberMatch = text.match(/(商\s*烟\s*立?\s*[\[〔]\s*\d{4}\s*[\]〕]\s*第\s*\d+\s*号)/i);
                if (caseNumberMatch) {
                    info.caseNumber = caseNumberMatch[1].replace(/\s+/g, '').replace('立', '');
                    console.log('提取到案件编号(商烟格式):', info.caseNumber);
                }
            }
            
            // 案件名称 - OCR可能将"本案"识别为"本昌"，需要更灵活的匹配
            // 查找"本案"或"本昌"后面的内容
            const caseNameIndex = text.search(/本\s*[案昌]|案件名称|案由/i);
            console.log('案件名称关键词位置:', caseNameIndex);
            if (caseNameIndex >= 0) {
                const afterKeyword = text.substring(caseNameIndex, caseNameIndex + 300);
                console.log('案件名称后300字符:', afterKeyword);
                let match = afterKeyword.match(/[:：]\s*([^\n]{2,100})/);
                if (!match) {
                    // 如果没有冒号，查找关键词后的第一行非空内容
                    const afterName = afterKeyword.replace(/本\s*[案昌]\s*/, '').trim();
                    const lines = afterName.split('\n').filter(line => line.trim());
                    if (lines.length > 0 && lines[0].length > 1 && lines[0].length < 100) {
                        info.caseName = lines[0].trim();
                        console.log('提取到案件名称(无冒号):', info.caseName);
                    }
                } else {
                    info.caseName = match[1].trim();
                    console.log('提取到案件名称:', info.caseName);
                }
            }
            
            // 立案日期 - 在文本中查找日期格式，通常在案件来源附近
            // 查找 "案件来源" 后面的日期，或者直接查找日期格式
            const datePatterns = [
                /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/,
                /(\d{4})[年\/-](\d{1,2})[月\/-](\d{1,2})[日]?/
            ];
            
            let dateMatch = null;
            for (const pattern of datePatterns) {
                dateMatch = text.match(pattern);
                if (dateMatch) break;
            }
            
            if (dateMatch) {
                info.caseDate = `${dateMatch[1]}年${dateMatch[2]}月${dateMatch[3]}日`;
                console.log('提取到立案日期:', info.caseDate);
            } else {
                console.log('未能找到立案日期');
            }
            
            // 当事人 - 查找"当事人"后面的内容，限制长度避免包含过多文字
            const partyIndex = text.search(/当\s*事\s*人/i);
            console.log('当事人关键词位置:', partyIndex);
            if (partyIndex >= 0) {
                const afterKeyword = text.substring(partyIndex, partyIndex + 200);
                console.log('当事人后200字符:', afterKeyword);
                let match = afterKeyword.match(/[:：]\s*([^\n]{2,20})/);
                if (!match) {
                    // 提取"当事人"后面的2-4个汉字（通常是姓名）
                    const afterName = afterKeyword.replace(/当\s*事\s*人\s*/, '').trim();
                    // 查找前几个汉字（通常是2-4个字的人名）
                    const nameMatch = afterName.match(/^([\u4e00-\u9fa5]{2,4})/);
                    if (nameMatch) {
                        info.party = nameMatch[1];
                        console.log('提取到当事人(无冒号):', info.party);
                    }
                } else {
                    // 如果找到冒号，取冒号后的内容，但只取前几个字符
                    const fullName = match[1].trim();
                    // 限制长度，取前10个字符
                    info.party = fullName.substring(0, 10);
                    console.log('提取到当事人:', info.party);
                }
            }
            
            console.log('立案报告表提取结果:', info);
            return info;
        },
        
        // 提取案件信息
        extractCaseInfo: function(text) {
            console.log('提取案件信息，文本长度:', text.length);
            
            // 调用专门的提取函数
            const info = this.extractCaseDocumentInfo(text);
            
            // 添加额外的字段
            const natureMatch = text.match(/案件性质[：:]\s*([^\n]+)/) ||
                                text.match(/性质[：:]\s*([^\n]+)/);
            if (natureMatch) info.caseNature = natureMatch[1].trim();
            
            if (text.includes('烟草')) info.caseType = '烟草案件';
            else if (text.includes('假冒')) info.caseType = '假冒案件';
            else if (text.includes('走私')) info.caseType = '走私案件';
            
            console.log('案件信息提取结果:', info);
            return info;
        },
        
        // 匹配发票和支付记录
        matchInvoicesAndPayments: function() {
            const matches = [];
            
            // 1. 匹配PDF和XML发票
            const pdfInvoices = this.results.invoices.filter(inv => inv.source === 'pdf');
            const xmlInvoices = this.results.invoices.filter(inv => inv.source === 'xml');
            
            pdfInvoices.forEach(pdfInv => {
                const matchingXml = xmlInvoices.find(xmlInv => xmlInv.invoiceNumber === pdfInv.invoiceNumber);
                if (matchingXml) {
                    matches.push({
                        type: 'pdf-xml',
                        pdf: pdfInv,
                        xml: matchingXml,
                        status: 'matched'
                    });
                }
            });
            
            // 2. 匹配发票和支付记录
            this.results.invoices.forEach(invoice => {
                const matchingPayment = this.results.payments.find(payment => {
                    // 按名称匹配
                    if (invoice.sellerName && payment.payee) {
                        return payment.payee.includes(invoice.sellerName) || invoice.sellerName.includes(payment.payee);
                    }
                    // 按金额匹配
                    if (invoice.totalAmount && payment.amount) {
                        return Math.abs(parseFloat(invoice.totalAmount) - parseFloat(payment.amount)) < 0.01;
                    }
                    return false;
                });
                
                if (matchingPayment) {
                    matches.push({
                        type: 'invoice-payment',
                        invoice: invoice,
                        payment: matchingPayment,
                        status: 'matched'
                    });
                } else {
                    matches.push({
                        type: 'invoice-payment',
                        invoice: invoice,
                        status: 'unmatched'
                    });
                }
            });
            
            this.results.matches = matches;
        },
        
        // 提取关键信息
        extractKeyInformation: function() {
            const info = {};
            
            console.log('开始提取关键信息...');
            console.log('travelDocs数量:', this.results.travelDocs.length);
            console.log('caseDocs数量:', this.results.caseDocs.length);
            console.log('invoices数量:', this.results.invoices.length);
            console.log('payments数量:', this.results.payments.length);
            
            // 打印所有travelDocs的type
            this.results.travelDocs.forEach((doc, i) => {
                console.log(`travelDocs[${i}].type:`, doc.type);
            });
            
            // 打印所有caseDocs的type
            this.results.caseDocs.forEach((doc, i) => {
                console.log(`caseDocs[${i}].type:`, doc.type);
            });
            
            // 1. 从外出办案审批表提取 - 使用更灵活的查找
            let outingApproval = this.results.travelDocs.find(doc => doc.type === 'outingApproval');
            // 如果没有找到，尝试从第一个travelDoc获取信息
            if (!outingApproval && this.results.travelDocs.length > 0) {
                outingApproval = this.results.travelDocs[0];
                console.log('使用第一个travelDoc作为outingApproval:', outingApproval);
            }
            console.log('outingApproval:', outingApproval);
            if (outingApproval) {
                info.A = outingApproval.caseName || ''; // 案件名称
                info.B = outingApproval.location || ''; // 办案地点
                info.C = outingApproval.jointUnit || ''; // 联合办案单位
                info.D = outingApproval.caseDescription || ''; // 案件情况
                info.K = outingApproval.onSiteInfo || ''; // 当场查获信息
            }
            
            // 2. 从出差审批单提取
            let travelApproval = this.results.travelDocs.find(doc => doc.type === 'travelApproval');
            // 如果没有找到，且有多于一个travelDoc，尝试使用第二个
            if (!travelApproval && this.results.travelDocs.length > 1) {
                travelApproval = this.results.travelDocs[1];
                console.log('使用第二个travelDoc作为travelApproval:', travelApproval);
            }
            console.log('travelApproval:', travelApproval);
            if (travelApproval) {
                info.E = travelApproval.travelers || []; // 出差人
                info.F = travelApproval.externalPersonnel || []; // 行业外人员
                info.G = travelApproval.startDate || ''; // 出差起始日期
                info.H = travelApproval.endDate || ''; // 出差截止日期
                info.I = travelApproval.destinations || []; // 到达地
                info.J = travelApproval.description || ''; // 申请说明
            }
            
            // 3. 从立案报告提取
            let caseDoc = this.results.caseDocs.find(doc => doc.type === 'caseDocument');
            // 如果没有找到，尝试使用第一个caseDoc
            if (!caseDoc && this.results.caseDocs.length > 0) {
                caseDoc = this.results.caseDocs[0];
                console.log('使用第一个caseDoc:', caseDoc);
            }
            console.log('caseDoc:', caseDoc);
            if (caseDoc) {
                info.L = caseDoc.caseNumber || ''; // 案件编号
            }
            
            // 4. 从租车结算单提取
            let carRental = this.results.travelDocs.find(doc => doc.type === 'carRental');
            // 如果没有找到，尝试从任意travelDoc中获取租车相关信息
            if (!carRental) {
                carRental = this.results.travelDocs.find(doc => doc.plateNumber || doc.carInfo);
                console.log('通过plateNumber/carInfo找到carRental:', carRental);
            }
            console.log('carRental:', carRental);
            if (carRental) {
                info.M = carRental.plateNumber || ''; // 车牌号码
                info.N = carRental.pickUpTime || ''; // 实际取车时间
                info.O = carRental.returnTime || ''; // 实际还车时间
                info.P = carRental.carInfo || ''; // 车辆信息
                info.Q = parseFloat(carRental.totalAmount) || 0; // 费用总金额
            }
            
            // 5. 从发票提取
            const invoices = this.results.invoices;
            const issueDates = invoices.filter(inv => inv.issueDate).map(inv => this.parseDate(inv.issueDate));
            if (issueDates.length > 0) {
                info.R = this.formatDate(new Date(Math.min(...issueDates))); // 开票最早时间
                info.S = this.formatDate(new Date(Math.max(...issueDates))); // 开票最晚时间
            }
            
            // 统计各类费用
            info.T = invoices.filter(inv => inv.type === '高铁票').reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0); // 高铁票总金额
            info.U = invoices.filter(inv => inv.type === '燃油费').reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0); // 燃油费总金额
            info.V = invoices.filter(inv => inv.type === '过路费').reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0); // 过路费总金额
            
            // 6. 从支付记录提取
            const payments = this.results.payments;
            const payTimes = payments.filter(p => p.payTime).map(p => this.parseDate(p.payTime));
            if (payTimes.length > 0) {
                info.X = this.formatDate(new Date(Math.min(...payTimes))); // 支付最早时间
                info.Y = this.formatDate(new Date(Math.max(...payTimes))); // 支付最晚时间
                
                // 计算Z = Y + 5天
                const yDate = new Date(Math.max(...payTimes));
                yDate.setDate(yDate.getDate() + 5);
                info.Z = this.formatDate(yDate);
            }
            
            // 7. 计算其他值
            info.W = 0; // 伙食补助费，需要根据人数和天数计算
            info.a = (info.Q || 0) + (info.T || 0) + (info.U || 0) + (info.V || 0) + (info.W || 0); // 差旅费总金额
            
            // 8. 计算租车天数
            if (info.N && info.O) {
                const startDate = this.parseDate(info.N);
                const endDate = this.parseDate(info.O);
                const diffTime = Math.abs(endDate - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                info.b = diffDays; // 租车天数
            }
            
            this.results.extractedInfo = info;
        },
        
        // 解析日期
        parseDate: function(dateStr) {
            if (!dateStr) return new Date();
            
            // 处理不同格式的日期
            const formats = [
                /(\d{4})年(\d{1,2})月(\d{1,2})日/,
                /(\d{4})-(\d{1,2})-(\d{1,2})/,
                /(\d{4})\/(\d{1,2})\/(\d{1,2})/
            ];
            
            for (const format of formats) {
                const match = dateStr.match(format);
                if (match) {
                    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                }
            }
            
            return new Date();
        },
        
        // 格式化日期
        formatDate: function(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}年${month}月${day}日`;
        },
        
        // 计算出差天数
        calculateTravelDays: function(person) {
            const info = this.results.extractedInfo;
            if (info.G && info.H) {
                const startDate = this.parseDate(info.G);
                const endDate = this.parseDate(info.H);
                const diffTime = Math.abs(endDate - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 包含起止日期
                return diffDays;
            }
            return 0;
        },
        
        // 数字转中文大写
        numberToChinese: function(num) {
            const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
            const units = ['', '拾', '佰', '仟'];
            const bigUnits = ['', '万', '亿'];
            
            if (num === 0) return '零圆整';
            
            let integerPart = Math.floor(num);
            let decimalPart = Math.round((num - integerPart) * 100);
            
            let result = '';
            let unitIndex = 0;
            let bigUnitIndex = 0;
            
            if (integerPart > 0) {
                while (integerPart > 0) {
                    const section = integerPart % 10000;
                    if (section > 0) {
                        let sectionResult = '';
                        let temp = section;
                        let sectionUnitIndex = 0;
                        
                        while (temp > 0) {
                            const digit = temp % 10;
                            if (digit > 0) {
                                sectionResult = digits[digit] + units[sectionUnitIndex] + sectionResult;
                            } else if (sectionResult && !sectionResult.startsWith('零')) {
                                sectionResult = '零' + sectionResult;
                            }
                            temp = Math.floor(temp / 10);
                            sectionUnitIndex++;
                        }
                        
                        result = sectionResult + bigUnits[bigUnitIndex] + result;
                    }
                    integerPart = Math.floor(integerPart / 10000);
                    bigUnitIndex++;
                }
                result += '圆';
            }
            
            if (decimalPart > 0) {
                const jiao = Math.floor(decimalPart / 10);
                const fen = decimalPart % 10;
                if (jiao > 0) result += digits[jiao] + '角';
                if (fen > 0) result += digits[fen] + '分';
            } else {
                result += '整';
            }
            
            return result;
        },
        
        // 获取匹配状态
        getMatchStatus: function() {
            const unmatchedInvoices = this.results.matches.filter(m => m.status === 'unmatched');
            const matchedInvoices = this.results.matches.filter(m => m.status === 'matched');
            
            return {
                total: this.results.invoices.length,
                matched: matchedInvoices.length,
                unmatched: unmatchedInvoices.length,
                details: this.results.matches
            };
        }
    };

    // 注册到全局
    if (typeof window !== 'undefined') {
        window.TravelExpenseCore = TravelExpenseCore;
    }
    
    // 注册到模块系统
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TravelExpenseCore;
    }
})();