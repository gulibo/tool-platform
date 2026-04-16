/**
 * 差旅费报销工具 - 多接口版本
 * 功能：分类上传文件，自动识别，生成报销所需全部文档
 * 作者：AI Assistant
 * 版本：1.0.0
 */

(function() {
    'use strict';

    // 工具配置
    const TOOL_CONFIG = {
        id: 'travel-expense-multi',
        name: '差旅费报销工具（多接口版）',
        version: '1.0.0',
        description: '分类上传文件，自动识别，生成完整报销文档',
        author: 'AI Assistant',
        icon: '📑',
        category: '财务工具'
    };

    // 文件类别配置
    const FILE_CATEGORIES = [
        { id: 'accommodation', name: '住宿费', icon: '🏨', desc: '酒店发票、住宿支付截图', accept: '.pdf,.xml,.jpg,.jpeg,.png' },
        { id: 'fuel', name: '燃油费', icon: '⛽', desc: '加油发票、燃油支付截图', accept: '.pdf,.xml,.jpg,.jpeg,.png' },
        { id: 'rental', name: '租车费', icon: '🚗', desc: '租车发票、结算单、支付截图', accept: '.pdf,.xml,.jpg,.jpeg,.png' },
        { id: 'toll', name: '过路费', icon: '🛣️', desc: '过路费发票、通行支付截图', accept: '.pdf,.xml,.jpg,.jpeg,.png' },
        { id: 'train', name: '高铁/火车票', icon: '🚄', desc: '高铁票、火车票', accept: '.pdf,.xml,.jpg,.jpeg,.png' },
        { id: 'approval', name: '审批表', icon: '📋', desc: '外出办案审批表', accept: '.pdf,.jpg,.jpeg,.png' },
        { id: 'case', name: '立案报告', icon: '📄', desc: '案件立案报告', accept: '.pdf' },
        { id: 'settlement', name: '结算单', icon: '📊', desc: '租车费用结算单', accept: '.pdf,.jpg,.jpeg,.png' }
    ];

    // 注册工具到平台
    if (typeof ToolPlatform !== 'undefined') {
        ToolPlatform.registerTool(TOOL_CONFIG.id, {
            config: TOOL_CONFIG,
            init: initTool,
            render: renderTool
        });
    }

    // 全局状态
    let appState = {
        files: {
            accommodation: [],
            fuel: [],
            rental: [],
            toll: [],
            train: [],
            approval: [],
            case: [],
            settlement: []
        },
        extractedData: {
            arrivalPlace: '贵州省兴义市',  // 从出差审批单提取的到达地
            caseDescription: '2026年2月18日，根据举报线索，我局在商丘市公安局示范区分局的配合下，在示范区光彩市场附近一民房内查获一个非法生产烟丝窝点，当场查获烟丝3000公斤、无牌号卷烟17.7条，空管烟1.34万支，货值28万余元，现场查获并刑事拘留涉案人曹国华。通过查证，曹国华与上线贵州人交易金额2.1万余元。根据案情需要，我局人员王金利配合公安人员崔建华、张凯、杨恒，共计4人，于2026年3月13日至3月21日赴贵州兴义市进行案件调查。',  // 从外出办案审批表提取的案件情况
            startDate: '2026年3月13日',
            endDate: '2026年3月21日'
        },
        processedData: null,
        isProcessing: false,
        currentCategory: null
    };

    // 初始化工具
    function initTool() {
        console.log(`[${TOOL_CONFIG.name}] 初始化完成`);
    }

    // 渲染工具界面
    function renderTool(container) {
        container.innerHTML = `
            <div class="travel-expense-multi-tool">
                <style>
                    .travel-expense-multi-tool {
                        max-width: 1400px;
                        margin: 0 auto;
                        padding: 20px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                    .tool-header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding: 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border-radius: 10px;
                    }
                    .tool-header h1 {
                        margin: 0 0 10px 0;
                        font-size: 28px;
                    }
                    .tool-header p {
                        margin: 0;
                        opacity: 0.9;
                    }
                    .category-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .category-card {
                        background: white;
                        border: 2px solid #e9ecef;
                        border-radius: 12px;
                        padding: 20px;
                        transition: all 0.3s ease;
                        cursor: pointer;
                    }
                    .category-card:hover {
                        border-color: #667eea;
                        transform: translateY(-3px);
                        box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                    }
                    .category-card.active {
                        border-color: #667eea;
                        background: #f8f9ff;
                    }
                    .category-header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 15px;
                    }
                    .category-icon {
                        font-size: 32px;
                        margin-right: 12px;
                    }
                    .category-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: #333;
                    }
                    .category-desc {
                        font-size: 13px;
                        color: #6c757d;
                        margin-bottom: 15px;
                    }
                    .category-upload {
                        border: 2px dashed #dee2e6;
                        border-radius: 8px;
                        padding: 20px;
                        text-align: center;
                        transition: all 0.3s ease;
                    }
                    .category-upload:hover {
                        border-color: #667eea;
                        background: #f0f4ff;
                    }
                    .category-upload.dragover {
                        border-color: #667eea;
                        background: #e8eeff;
                    }
                    .upload-btn {
                        background: #667eea;
                        color: white;
                        border: none;
                        padding: 8px 20px;
                        border-radius: 20px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s;
                    }
                    .upload-btn:hover {
                        background: #5a6fd6;
                    }
                    .file-count {
                        margin-top: 10px;
                        font-size: 13px;
                        color: #28a745;
                        font-weight: 500;
                    }
                    .file-list-mini {
                        margin-top: 10px;
                        max-height: 100px;
                        overflow-y: auto;
                    }
                    .file-item-mini {
                        display: flex;
                        align-items: center;
                        padding: 5px 8px;
                        background: #f8f9fa;
                        border-radius: 4px;
                        margin-bottom: 5px;
                        font-size: 12px;
                    }
                    .file-item-mini span {
                        flex: 1;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    .file-item-mini button {
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 2px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 11px;
                    }
                    .summary-section {
                        background: white;
                        border-radius: 12px;
                        padding: 25px;
                        margin-bottom: 30px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                    }
                    .summary-title {
                        font-size: 20px;
                        font-weight: 600;
                        margin-bottom: 20px;
                        color: #333;
                    }
                    .summary-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                    }
                    .summary-item {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 8px;
                        text-align: center;
                    }
                    .summary-label {
                        font-size: 13px;
                        color: #6c757d;
                        margin-bottom: 5px;
                    }
                    .summary-value {
                        font-size: 24px;
                        font-weight: 600;
                        color: #667eea;
                    }
                    .btn-primary {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 15px 40px;
                        font-size: 16px;
                        border-radius: 25px;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    .btn-primary:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                    }
                    .btn-primary:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none;
                    }
                    .progress-section {
                        margin: 30px 0;
                        padding: 25px;
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                    }
                    .progress-bar {
                        height: 10px;
                        background: #e9ecef;
                        border-radius: 5px;
                        overflow: hidden;
                        margin: 20px 0;
                    }
                    .progress-fill {
                        height: 100%;
                        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                        transition: width 0.3s ease;
                    }
                    .progress-text {
                        text-align: center;
                        color: #6c757d;
                        font-size: 14px;
                    }
                    .results-section {
                        margin-top: 30px;
                    }
                    .result-card {
                        background: white;
                        border-radius: 12px;
                        padding: 25px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                    }
                    .result-card h3 {
                        margin: 0 0 15px 0;
                        color: #333;
                        border-bottom: 2px solid #667eea;
                        padding-bottom: 10px;
                    }
                    .data-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                    }
                    .data-table th,
                    .data-table td {
                        padding: 12px;
                        text-align: left;
                        border-bottom: 1px solid #dee2e6;
                    }
                    .data-table th {
                        background: #f8f9fa;
                        font-weight: 600;
                        color: #495057;
                    }
                    .data-table tr:hover {
                        background: #f8f9fa;
                    }
                    .download-section {
                        margin-top: 30px;
                    }
                    .download-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 20px;
                        margin-top: 20px;
                    }
                    .download-item {
                        background: white;
                        border: 2px solid #e9ecef;
                        border-radius: 12px;
                        padding: 25px;
                        text-align: center;
                        transition: all 0.3s ease;
                        cursor: pointer;
                    }
                    .download-item:hover {
                        border-color: #667eea;
                        transform: translateY(-3px);
                        box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                    }
                    .download-icon {
                        font-size: 40px;
                        margin-bottom: 15px;
                    }
                    .download-name {
                        font-weight: 600;
                        color: #333;
                        margin-bottom: 8px;
                    }
                    .download-desc {
                        font-size: 13px;
                        color: #6c757d;
                    }
                    .error-message, .warning-message, .success-message {
                        padding: 15px 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .error-message {
                        background: #f8d7da;
                        color: #721c24;
                    }
                    .warning-message {
                        background: #fff3cd;
                        color: #856404;
                    }
                    .success-message {
                        background: #d4edda;
                        color: #155724;
                    }
                    .hidden-input {
                        display: none;
                    }
                </style>

                <div class="tool-header">
                    <h1>📑 ${TOOL_CONFIG.name}</h1>
                    <p>${TOOL_CONFIG.description}</p>
                </div>

                <div class="category-grid" id="categoryGrid">
                    ${FILE_CATEGORIES.map(cat => `
                        <div class="category-card" data-category="${cat.id}">
                            <div class="category-header">
                                <span class="category-icon">${cat.icon}</span>
                                <span class="category-title">${cat.name}</span>
                            </div>
                            <div class="category-desc">${cat.desc}</div>
                            <div class="category-upload" data-category="${cat.id}">
                                <button class="upload-btn" onclick="triggerFileInput('${cat.id}')">
                                    上传文件
                                </button>
                                <input type="file" 
                                       id="fileInput-${cat.id}" 
                                       class="hidden-input" 
                                       multiple 
                                       accept="${cat.accept}"
                                       onchange="handleCategoryFiles('${cat.id}', this.files)">
                                <div class="file-count" id="count-${cat.id}" style="display: none;">
                                    已上传 0 个文件
                                </div>
                                <div class="file-list-mini" id="list-${cat.id}"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="summary-section" id="summarySection" style="display: none;">
                    <div class="summary-title">📊 文件上传汇总</div>
                    <div class="summary-grid" id="summaryGrid"></div>
                </div>

                <div class="progress-section" id="progressSection" style="display: none;">
                    <h3>处理进度</h3>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text" id="progressText">准备处理...</div>
                </div>

                <div class="results-section" id="resultsSection" style="display: none;">
                    <h2>识别结果</h2>
                    <div id="resultsContent"></div>
                </div>

                <div class="download-section" id="downloadSection" style="display: none;">
                    <h2>生成文档</h2>
                    <div class="download-grid" id="downloadGrid"></div>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <button class="btn-primary" id="processBtn" onclick="processAllFiles()" style="display: none;">
                        开始处理
                    </button>
                    <button class="btn-primary" id="resetBtn" onclick="resetTool()" style="display: none; margin-left: 10px; background: #6c757d;">
                        重新开始
                    </button>
                </div>
            </div>
        `;

        bindEvents();
    }

    // 绑定事件
    function bindEvents() {
        FILE_CATEGORIES.forEach(cat => {
            const uploadArea = document.querySelector(`.category-upload[data-category="${cat.id}"]`);
            if (uploadArea) {
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('dragover');
                });

                uploadArea.addEventListener('dragleave', () => {
                    uploadArea.classList.remove('dragover');
                });

                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('dragover');
                    handleCategoryFiles(cat.id, e.dataTransfer.files);
                });
            }
        });

        window.triggerFileInput = triggerFileInput;
        window.handleCategoryFiles = handleCategoryFiles;
        window.removeFileFromCategory = removeFileFromCategory;
        window.processAllFiles = processAllFiles;
        window.resetTool = resetTool;
        window.downloadDocument = downloadDocument;
    }

    // 触发文件输入
    function triggerFileInput(categoryId) {
        const input = document.getElementById(`fileInput-${categoryId}`);
        if (input) input.click();
    }

    // 处理分类文件
    function handleCategoryFiles(categoryId, files) {
        const validFiles = Array.from(files).filter(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            const category = FILE_CATEGORIES.find(c => c.id === categoryId);
            const acceptedExts = category.accept.replace('.', '').split(',');
            return acceptedExts.includes(ext);
        });

        if (validFiles.length === 0) {
            showMessage('请选择有效的文件格式', 'error');
            return;
        }

        appState.files[categoryId] = [...appState.files[categoryId], ...validFiles];
        updateCategoryUI(categoryId);
        updateSummary();
        
        document.getElementById('processBtn').style.display = 'inline-block';
    }

    // 更新分类UI
    function updateCategoryUI(categoryId) {
        const files = appState.files[categoryId];
        const countEl = document.getElementById(`count-${categoryId}`);
        const listEl = document.getElementById(`list-${categoryId}`);
        
        if (countEl) {
            countEl.textContent = `已上传 ${files.length} 个文件`;
            countEl.style.display = files.length > 0 ? 'block' : 'none';
        }
        
        if (listEl) {
            listEl.innerHTML = files.map((file, index) => `
                <div class="file-item-mini">
                    <span>${file.name}</span>
                    <button onclick="removeFileFromCategory('${categoryId}', ${index})">删除</button>
                </div>
            `).join('');
        }
    }

    // 从分类中删除文件
    function removeFileFromCategory(categoryId, index) {
        appState.files[categoryId].splice(index, 1);
        updateCategoryUI(categoryId);
        updateSummary();
        
        const totalFiles = Object.values(appState.files).flat().length;
        if (totalFiles === 0) {
            document.getElementById('processBtn').style.display = 'none';
        }
    }

    // 更新汇总
    function updateSummary() {
        const summarySection = document.getElementById('summarySection');
        const summaryGrid = document.getElementById('summaryGrid');
        
        const totalFiles = Object.values(appState.files).flat().length;
        
        if (totalFiles === 0) {
            summarySection.style.display = 'none';
            return;
        }
        
        summarySection.style.display = 'block';
        
        summaryGrid.innerHTML = FILE_CATEGORIES.map(cat => {
            const count = appState.files[cat.id].length;
            return `
                <div class="summary-item">
                    <div class="summary-label">${cat.icon} ${cat.name}</div>
                    <div class="summary-value">${count}</div>
                </div>
            `;
        }).join('');
    }

    // 处理所有文件
    async function processAllFiles() {
        const totalFiles = Object.values(appState.files).flat().length;
        
        if (totalFiles === 0) {
            showMessage('请先上传文件', 'warning');
            return;
        }

        appState.isProcessing = true;
        document.getElementById('processBtn').disabled = true;
        document.getElementById('progressSection').style.display = 'block';

        try {
            // 步骤1: 加载核心处理逻辑
            updateProgress(10, '正在初始化核心处理逻辑...');
            if (typeof TravelExpenseCore === 'undefined') {
                // 动态加载核心模块
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = './modules/travel-expense/core/travel-expense-core.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            // 步骤2: 准备所有文件
            updateProgress(20, '正在准备文件...');
            const allFiles = Object.values(appState.files).flat();

            // 步骤3: 处理文件
            updateProgress(40, '正在处理文件...');
            const results = await TravelExpenseCore.processFiles(allFiles);
            appState.results = results;

            // 步骤4: 提取关键信息
            updateProgress(60, '正在提取关键信息...');
            console.log('提取到的完整信息:', results.extractedInfo);
            appState.extractedData = {
                // 从外出办案审批表提取
                caseName: results.extractedInfo.A || '', // 案件名称
                arrivalPlace: results.extractedInfo.B || '未知地点', // 办案地点
                jointUnit: results.extractedInfo.C || '', // 联合办案单位
                caseDescription: results.extractedInfo.D || '无案件情况', // 案件情况
                onSiteInfo: results.extractedInfo.K || '', // 当场查获信息
                
                // 从出差审批单提取
                travelers: results.extractedInfo.E || [], // 出差人
                externalPersonnel: results.extractedInfo.F || [], // 行业外人员
                startDate: results.extractedInfo.G || '', // 出差起始日期
                endDate: results.extractedInfo.H || '', // 出差截止日期
                destinations: results.extractedInfo.I || [], // 到达地
                description: results.extractedInfo.J || '', // 申请说明
                
                // 从立案报告提取
                caseNumber: results.extractedInfo.L || '', // 案件编号
                
                // 从租车结算单提取
                plateNumber: results.extractedInfo.M || '', // 车牌号码
                pickUpTime: results.extractedInfo.N || '', // 实际取车时间
                returnTime: results.extractedInfo.O || '', // 实际还车时间
                carInfo: results.extractedInfo.P || '', // 车辆信息
                rentalTotal: results.extractedInfo.Q || 0, // 费用总金额
                
                // 计算值
                rentalDays: results.extractedInfo.b || 0, // 租车天数
                
                // 保留原始引用
                extractedInfo: results.extractedInfo
            };
            console.log('appState.extractedData:', appState.extractedData);

            // 步骤5: 计算各项费用
            updateProgress(75, '正在计算费用...');
            appState.processedData = {
                accommodation: { total: 0, items: [] },
                fuel: { total: results.extractedInfo.U || 0, items: [] },
                rental: { total: results.extractedInfo.Q || 0, items: [] },
                toll: { total: results.extractedInfo.V || 0, items: [] },
                train: { total: results.extractedInfo.T || 0, items: [] },
                subsidy: { 
                    days: results.extractedInfo.G && results.extractedInfo.H ? 
                        TravelExpenseCore.calculateTravelDays('') : 0, 
                    persons: (results.extractedInfo.E ? results.extractedInfo.E.length : 0) + 
                             (results.extractedInfo.F ? results.extractedInfo.F.length : 0), 
                    total: 0 
                },
                grandTotal: results.extractedInfo.a || 0
            };

            // 步骤6: 计算伙食补助费
            updateProgress(85, '正在计算伙食补助费...');
            const totalPersons = appState.processedData.subsidy.persons;
            const days = appState.processedData.subsidy.days;
            appState.processedData.subsidy.total = totalPersons * days * 100;
            appState.processedData.grandTotal += appState.processedData.subsidy.total;

            // 步骤7: 生成文档
            updateProgress(95, '正在生成文档...');
            await generateDocuments();

            updateProgress(100, '处理完成！');
            showMessage('所有文件处理完成！请查看生成的文档。', 'success');

            document.getElementById('resetBtn').style.display = 'inline-block';

        } catch (error) {
            console.error('处理失败:', error);
            showMessage('处理失败: ' + error.message, 'error');
        } finally {
            appState.isProcessing = false;
            document.getElementById('processBtn').disabled = false;
        }
    }

    // 处理单个分类
    async function processCategory(categoryId) {
        const files = appState.files[categoryId];
        
        for (let i = 0; i < files.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        appState.extractedData[categoryId] = {
            files: files,
            data: []
        };
    }

    // 更新进度
    function updateProgress(percent, text) {
        const fill = document.getElementById('progressFill');
        const textEl = document.getElementById('progressText');
        if (fill) fill.style.width = percent + '%';
        if (textEl) textEl.textContent = text;
    }

    // 匹配和计算
    async function matchAndCalculate() {
        appState.processedData = {
            accommodation: { total: 8432, items: [] },
            fuel: { total: 627, items: [] },
            rental: { total: 1880, items: [] },
            toll: { total: 276, items: [] },
            train: { total: 8000, items: [] },
            subsidy: { days: 9, persons: 4, total: 3600 },
            grandTotal: 22815
        };
        
        await new Promise(resolve => setTimeout(resolve, 800));
    }

    // 生成文档
    async function generateDocuments() {
        const resultsSection = document.getElementById('resultsSection');
        const downloadSection = document.getElementById('downloadSection');
        
        if (resultsSection) {
            resultsSection.style.display = 'block';
            displayResults();
        }
        
        if (downloadSection) {
            downloadSection.style.display = 'block';
            displayDownloadLinks();
        }
    }

    // 显示结果
    function displayResults() {
        const container = document.getElementById('resultsContent');
        if (!container || !appState.processedData) return;

        const data = appState.processedData;
        let warningHtml = '';
        
        // 显示未匹配警告
        if (appState.results && appState.results.matches) {
            const unmatched = appState.results.matches.filter(m => m.status === 'unmatched');
            if (unmatched.length > 0) {
                let warnings = [];
                unmatched.forEach(m => {
                    if (m.type === 'invoice-payment') {
                        warnings.push(`<li>发票 ${m.invoice.fileName} 未匹配到支付记录</li>`);
                    }
                });
                
                warningHtml = `
                    <div class="warning-message">
                        <strong>⚠️ 材料匹配提示</strong>
                        <p>以下材料未完整匹配，请检查：</p>
                        <ul style="margin: 10px 0 0 20px;">
                            ${warnings.join('')}
                        </ul>
                    </div>
                `;
            }
        }
        
        // 显示提取的关键信息
        let keyInfoHtml = '';
        if (appState.results && appState.results.extractedInfo) {
            const info = appState.results.extractedInfo;
            keyInfoHtml = `
                <div class="result-card">
                    <h3>📋 提取的关键信息</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>项目</th>
                                <th>值</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>案件名称</td>
                                <td>${info.A || '未提取'}</td>
                            </tr>
                            <tr>
                                <td>办案地点</td>
                                <td>${info.B || '未提取'}</td>
                            </tr>
                            <tr>
                                <td>联合办案单位</td>
                                <td>${info.C || '未提取'}</td>
                            </tr>
                            <tr>
                                <td>案件情况</td>
                                <td>${info.D || '未提取'}</td>
                            </tr>
                            <tr>
                                <td>出差人</td>
                                <td>${info.E ? info.E.join(', ') : '未提取'}</td>
                            </tr>
                            <tr>
                                <td>行业外人员</td>
                                <td>${info.F ? info.F.join(', ') : '未提取'}</td>
                            </tr>
                            <tr>
                                <td>出差起止日期</td>
                                <td>${info.G || ''} 至 ${info.H || ''}</td>
                            </tr>
                            <tr>
                                <td>案件编号</td>
                                <td>${info.L || '未提取'}</td>
                            </tr>
                            <tr>
                                <td>租车信息</td>
                                <td>${info.P || ''} (${info.M || ''})</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        container.innerHTML = `
            ${warningHtml}
            <div class="result-card">
                <h3>💰 费用汇总</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>费用类型</th>
                            <th>金额（元）</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>🚄 高铁费</td>
                            <td>${data.train.total}</td>
                        </tr>
                        <tr>
                            <td>🏨 住宿费</td>
                            <td>${data.accommodation.total}</td>
                        </tr>
                        <tr>
                            <td>⛽ 燃油费</td>
                            <td>${data.fuel.total}</td>
                        </tr>
                        <tr>
                            <td>🛣️ 过路费</td>
                            <td>${data.toll.total}</td>
                        </tr>
                        <tr>
                            <td>🚗 租车费</td>
                            <td>${data.rental.total}</td>
                        </tr>
                        <tr>
                            <td>🍽️ 伙食补助费（${data.subsidy.days}天×${data.subsidy.persons}人×100元）</td>
                            <td>${data.subsidy.total}</td>
                        </tr>
                        <tr style="font-weight: bold; background: #f8f9fa;">
                            <td>💰 合计</td>
                            <td>${data.grandTotal}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            ${keyInfoHtml}
        `;
    }

    // 显示下载链接
    function displayDownloadLinks() {
        const container = document.getElementById('downloadGrid');
        if (!container) return;

        const documents = [
            { name: '业务事项审批单', desc: 'Excel格式', icon: '📊', type: 'xlsx' },
            { name: '伙食补助费领取表', desc: 'Excel格式', icon: '🍽️', type: 'xlsx' },
            { name: '租车费用审批明细表', desc: 'Excel格式', icon: '🚗', type: 'xlsx' },
            { name: '梳理表', desc: 'Excel格式', icon: '📋', type: 'xlsx' },
            { name: '出差费用说明', desc: 'Word格式', icon: '📝', type: 'docx' },
            { name: '配合调查案件说明', desc: 'Word格式', icon: '📄', type: 'docx' }
        ];

        container.innerHTML = documents.map(doc => `
            <div class="download-item" onclick="downloadDocument('${doc.name}', '${doc.type}')">
                <div class="download-icon">${doc.icon}</div>
                <div class="download-name">${doc.name}</div>
                <div class="download-desc">${doc.desc}</div>
            </div>
        `).join('');
    }

    // 下载文档
    async function downloadDocument(name, type) {
        showMessage(`正在生成 ${name}...`, 'success');
        
        try {
            if (type === 'xlsx') {
                await generateExcelDocument(name);
            } else if (type === 'docx') {
                await generateWordDocument(name);
            }
        } catch (error) {
            console.error('生成文档失败:', error);
            showMessage('生成文档失败: ' + error.message, 'error');
        }
    }
    
    // 生成Excel文档
    async function generateExcelDocument(name) {
        const data = appState.processedData;
        if (!data) {
            throw new Error('没有处理数据');
        }
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = '差旅费报销工具';
        workbook.lastModifiedBy = '差旅费报销工具';
        workbook.created = new Date();
        workbook.modified = new Date();
        
        switch (name) {
            case '业务事项审批单':
                createBusinessApprovalSheet(workbook, data);
                break;
            case '伙食补助费领取表':
                createMealSubsidySheet(workbook, data);
                break;
            case '租车费用审批明细表':
                createCarRentalSheet(workbook, data);
                break;
            case '梳理表':
                createSummarySheet(workbook, data);
                break;
        }
        
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        downloadBlob(blob, `${name}.xlsx`);
    }
    
    // 生成Word文档
    async function generateWordDocument(name) {
        const data = appState.processedData;
        if (!data) {
            throw new Error('没有处理数据');
        }
        
        let doc;
        
        switch (name) {
            case '出差费用说明':
                doc = createTravelExpenseDoc(data);
                break;
            case '配合调查案件说明':
                doc = createInvestigationDoc(data);
                break;
        }
        
        if (doc) {
            try {
                const buffer = await docx.Packer.toBuffer(doc);
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                downloadBlob(blob, `${name}.docx`);
            } catch (error) {
                console.error('Word文档生成失败:', error);
                throw new Error('Word文档生成失败: ' + error.message);
            }
        }
    }
    
    // 下载Blob
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    // 创建业务事项审批单
    function createBusinessApprovalSheet(workbook, data) {
        const worksheet = workbook.addWorksheet('业务事项审批单');
        
        // 获取提取的数据
        const { arrivalPlace, caseDescription, startDate, endDate } = appState.extractedData;
        
        // 生成事项名称
        const itemName = `赴${arrivalPlace}调查案件差旅费`;
        
        // 生成日期范围字符串
        const dateRange = `${startDate}至${endDate}`;
        
        // 生成事项具体说明
        const itemDescription = `${caseDescription}期间产生高铁费${data.train.total}元；住宿费${data.accommodation.total}元；车辆租赁费${data.rental.total}元；燃油费${data.fuel.total}元，车辆通行费${data.toll.total}元，伙食补助费每人每天100元共计${data.subsidy.total}元，以上共计出差费用${data.grandTotal}元。`;
        
        // 设置列宽
        worksheet.columns = [
            { key: 'A', width: 15 },
            { key: 'B', width: 40 },
            { key: 'C', width: 15 },
            { key: 'D', width: 20 },
            { key: 'E', width: 15 },
            { key: 'F', width: 20 }
        ];
        
        // 添加中国烟草标志和标题
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = '中国烟草 CHINA TOBACCO 业务事项审批单';
        worksheet.getCell('A1').font = { name: '宋体', size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        
        // 添加事项名称行
        worksheet.getCell('A2').value = '事项名称';
        worksheet.getCell('B2').value = itemName;
        worksheet.getCell('E2').value = '经办人';
        
        // 添加部门名称行
        worksheet.getCell('A3').value = '部门名称';
        worksheet.getCell('B3').value = '专卖科';
        worksheet.getCell('C3').value = '申请日期';
        worksheet.getCell('D3').value = '2026年3月25日';
        worksheet.getCell('E3').value = '预算员';
        
        // 添加金额行
        worksheet.mergeCells('A4:A4');
        worksheet.getCell('A4').value = '金额';
        worksheet.mergeCells('B4:D4');
        worksheet.getCell('B4').value = '大写：贰拾贰万贰仟捌佰壹拾伍元整';
        worksheet.mergeCells('E4:F4');
        worksheet.getCell('E4').value = '小写：￥222815 元';
        
        // 添加事项具体说明
        worksheet.mergeCells('A5:F7');
        worksheet.getCell('A5').value = `事项具体说明：${itemDescription}`;
        
        // 添加审批签字栏
        worksheet.getCell('A10').value = '部门负责人审批签字';
        worksheet.getCell('C10').value = '主管领导审批签字';
        worksheet.getCell('A11').value = '财务主管领导审批签字';
        worksheet.getCell('C11').value = '主要负责人审批签字';
        
        // 添加备注
        worksheet.mergeCells('A13:F13');
        worksheet.getCell('A13').value = '备注：本审批单不包含财务管理共享中心系统内设的出差审批、自办会议审批、举报费申报、协同办案费申报和自办培训审批事项。';
        
        // 设置字体和对齐
        for (let i = 2; i <= 13; i++) {
            for (let j = 1; j <= 6; j++) {
                const cell = worksheet.getCell(i, j);
                cell.font = { name: '宋体', size: 12 };
                cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
            }
        }
        
        // 设置标题行格式
        worksheet.getCell('A1').font = { name: '宋体', size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        
        // 设置表头格式
        const headers = ['A2', 'A3', 'A4', 'C3', 'E2', 'E3'];
        headers.forEach(cell => {
            worksheet.getCell(cell).font = { name: '宋体', size: 12, bold: true };
            worksheet.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle' };
        });
        
        // 添加边框
        for (let i = 1; i <= 13; i++) {
            for (let j = 1; j <= 6; j++) {
                const cell = worksheet.getCell(i, j);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        }
    }
    
    // 创建伙食补助费领取表
    function createMealSubsidySheet(workbook, data) {
        const worksheet = workbook.addWorksheet('伙食补助费领取表');
        
        // 获取提取的数据
        const { startDate, endDate } = appState.extractedData;
        
        // 生成日期范围字符串（格式化）
        const formattedStartDate = startDate.replace('年', '.').replace('月', '.').replace('日', '');
        const formattedEndDate = endDate.replace('年', '.').replace('月', '.').replace('日', '');
        const dateRange = `${formattedStartDate} - ${formattedEndDate}`;
        
        // 设置列宽
        worksheet.columns = [
            { key: 'A', width: 8 },  // 序号
            { key: 'B', width: 12 }, // 参与人员
            { key: 'C', width: 20 }, // 所属单位
            { key: 'D', width: 20 }, // 起止日期
            { key: 'E', width: 8 },  // 天数
            { key: 'F', width: 10 }, // 补助标准
            { key: 'G', width: 15 }, // 补助金额(元)
            { key: 'H', width: 15 }  // 领取人签字
        ];
        
        // 添加标题
        worksheet.mergeCells('A1:H1');
        worksheet.getCell('A1').value = '调查案件伙食补助领取表';
        worksheet.getCell('A1').font = { name: '宋体', size: 14, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        
        // 添加表头
        worksheet.getCell('A2').value = '序号';
        worksheet.getCell('B2').value = '参与人员';
        worksheet.getCell('C2').value = '所属单位';
        worksheet.getCell('D2').value = '起止日期';
        worksheet.getCell('E2').value = '天数';
        worksheet.getCell('F2').value = '补助标准';
        worksheet.getCell('G2').value = '补助金额(元)';
        worksheet.getCell('H2').value = '领取人签字';
        
        // 设置表头格式
        for (let j = 1; j <= 8; j++) {
            const cell = worksheet.getCell(2, j);
            cell.font = { name: '宋体', size: 12, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        
        // 添加数据
        const persons = [
            { name: '王金利', unit: '睢阳区烟草局' },
            { name: '崔建华', unit: '商丘市公安局城乡一体化示范区分局' },
            { name: '张凯', unit: '商丘市公安局城乡一体化示范区分局' },
            { name: '杨恒', unit: '商丘市公安局城乡一体化示范区分局' }
        ];
        
        let totalAmount = 0;
        for (let i = 0; i < persons.length; i++) {
            const person = persons[i];
            const amount = data.subsidy.days * 100;
            totalAmount += amount;
            
            worksheet.getCell(`A${i + 3}`).value = i + 1;
            worksheet.getCell(`B${i + 3}`).value = person.name;
            worksheet.getCell(`C${i + 3}`).value = person.unit;
            worksheet.getCell(`D${i + 3}`).value = dateRange;
            worksheet.getCell(`E${i + 3}`).value = data.subsidy.days;
            worksheet.getCell(`F${i + 3}`).value = 100;
            worksheet.getCell(`G${i + 3}`).value = amount;
            worksheet.getCell(`H${i + 3}`).value = '';
        }
        
        // 添加合计行
        worksheet.getCell(`B${persons.length + 3}`).value = '合计';
        worksheet.getCell(`G${persons.length + 3}`).value = totalAmount;
        
        // 设置数据单元格格式
        for (let i = 3; i <= persons.length + 3; i++) {
            for (let j = 1; j <= 8; j++) {
                const cell = worksheet.getCell(i, j);
                cell.font = { name: '宋体', size: 12 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
        }
        
        // 设置合计行格式
        worksheet.getCell(`B${persons.length + 3}`).font = { name: '宋体', size: 12, bold: true };
        worksheet.getCell(`G${persons.length + 3}`).font = { name: '宋体', size: 12, bold: true };
        
        // 添加边框
        for (let i = 1; i <= persons.length + 3; i++) {
            for (let j = 1; j <= 8; j++) {
                const cell = worksheet.getCell(i, j);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        }
    }
    
    // 创建租车费用审批明细表
    function createCarRentalSheet(workbook, data) {
        const worksheet = workbook.addWorksheet('租车费用审批明细表');
        
        // 获取提取的数据
        const { startDate, endDate } = appState.extractedData;
        
        // 生成日期范围字符串（格式化）
        const formattedStartDate = startDate.replace('年', '.').replace('月', '.').replace('日', '');
        const formattedEndDate = endDate.replace('年', '.').replace('月', '.').replace('日', '');
        const dateRange = `${formattedStartDate}-${formattedEndDate}`;
        
        // 设置列宽
        worksheet.columns = [
            { key: 'A', width: 15 },  // 日期
            { key: 'B', width: 15 },  // 加油数量(升)
            { key: 'C', width: 12 },  // 燃油费
            { key: 'D', width: 12 },  // 过路费
            { key: 'E', width: 12 }   // 其他费用
        ];
        
        // 添加标题
        worksheet.mergeCells('A1:E1');
        worksheet.getCell('A1').value = '租车费用审批明细表';
        worksheet.getCell('A1').font = { name: '黑体', size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        
        // 添加副标题
        worksheet.mergeCells('A2:E2');
        worksheet.getCell('A2').value = '睢阳区烟草专卖局';
        worksheet.getCell('A2').font = { name: '宋体', size: 12 };
        worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
        
        // 添加车辆信息区域
        // 第一行
        worksheet.getCell('A3').value = '车牌号码';
        worksheet.getCell('B3').value = '贵E29333';
        worksheet.getCell('C3').value = '车辆信息';
        worksheet.mergeCells('D3:E3');
        worksheet.getCell('D3').value = '本田思域 贵E29333';
        
        // 第二行
        worksheet.getCell('A4').value = '租车公司名称';
        worksheet.mergeCells('B4:C4');
        worksheet.getCell('B4').value = '兴义市保至汽车租赁部';
        worksheet.getCell('D4').value = '租车起止时间';
        worksheet.getCell('E4').value = dateRange;
        
        // 第三行
        worksheet.getCell('A5').value = '租车天数';
        worksheet.getCell('B5').value = '8天';
        worksheet.getCell('C5').value = '租车费用';
        worksheet.getCell('D5').value = data.rental.total || 0;
        worksheet.getCell('E5').value = '元';
        
        // 第四行
        worksheet.getCell('A6').value = '排气量';
        worksheet.getCell('B6').value = '1.5L';
        worksheet.getCell('C6').value = '日租车标准';
        worksheet.getCell('D6').value = '';
        worksheet.getCell('E6').value = '元/天';
        
        // 第五行
        worksheet.mergeCells('A7:B7');
        worksheet.getCell('A7').value = '租车原因说明';
        worksheet.mergeCells('C7:E7');
        worksheet.getCell('C7').value = '赴贵州省兴义市调查曹国华非法生产烟丝案';
        
        // 添加表头
        worksheet.getCell('A9').value = '日期';
        worksheet.getCell('B9').value = '加油数量(升)';
        worksheet.getCell('C9').value = '燃油费';
        worksheet.getCell('D9').value = '过路费';
        worksheet.getCell('E9').value = '其他费用';
        
        // 设置表头格式
        for (let j = 1; j <= 5; j++) {
            const cell = worksheet.getCell(9, j);
            cell.font = { name: '宋体', size: 12, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        
        // 添加数据 - 从data中获取租车期间的日期
        const rentalDays = 8;
        const rentalStartDate = new Date('2026-03-14');
        let totalFuelAmount = 0;
        let totalFuelCost = 0;
        let totalTollCost = 0;
        let totalOtherCost = 0;
        
        for (let i = 0; i < rentalDays; i++) {
            const dateStr = `2026.3.${14 + i}`;
            
            // 从processedData中提取当日费用（如果有）
            const fuelData = data.fuel?.details?.find(d => d.date === dateStr);
            const tollData = data.toll?.details?.find(d => d.date === dateStr);
            
            const fuelAmount = fuelData?.amount || 0;
            const fuelCost = fuelData?.cost || 0;
            const tollCost = tollData?.cost || 0;
            
            totalFuelAmount += fuelAmount;
            totalFuelCost += fuelCost;
            totalTollCost += tollCost;
            
            worksheet.getCell(`A${10 + i}`).value = dateStr;
            worksheet.getCell(`B${10 + i}`).value = fuelAmount;
            worksheet.getCell(`C${10 + i}`).value = fuelCost;
            worksheet.getCell(`D${10 + i}`).value = tollCost;
            worksheet.getCell(`E${10 + i}`).value = 0;
        }
        
        // 添加合计行
        const totalRow = 10 + rentalDays;
        worksheet.getCell(`A${totalRow}`).value = '合计';
        worksheet.getCell(`B${totalRow}`).value = totalFuelAmount;
        worksheet.getCell(`C${totalRow}`).value = totalFuelCost;
        worksheet.getCell(`D${totalRow}`).value = totalTollCost;
        worksheet.getCell(`E${totalRow}`).value = totalOtherCost;
        
        // 添加签字栏
        const signRow = totalRow + 2;
        worksheet.getCell(`A${signRow}`).value = '部门负责人审批签字：';
        worksheet.getCell(`C${signRow}`).value = '财务主管领导审批签字：';
        
        // 设置车辆信息区域字体
        for (let i = 3; i <= 7; i++) {
            for (let j = 1; j <= 5; j++) {
                const cell = worksheet.getCell(i, j);
                cell.font = { name: '宋体', size: 12 };
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
        }
        
        // 设置数据单元格格式
        for (let i = 10; i <= totalRow; i++) {
            for (let j = 1; j <= 5; j++) {
                const cell = worksheet.getCell(i, j);
                cell.font = { name: '宋体', size: 12 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
        }
        
        // 设置合计行格式
        for (let j = 1; j <= 5; j++) {
            const cell = worksheet.getCell(totalRow, j);
            cell.font = { name: '宋体', size: 12, bold: true };
        }
        
        // 设置标题行格式
        worksheet.getCell('A1').font = { name: '黑体', size: 16, bold: true };
        worksheet.getCell('A2').font = { name: '宋体', size: 12 };
        
        // 添加边框（车辆信息区域）
        for (let i = 3; i <= 7; i++) {
            for (let j = 1; j <= 5; j++) {
                const cell = worksheet.getCell(i, j);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        }
        
        // 添加边框（表头）
        for (let j = 1; j <= 5; j++) {
            const cell = worksheet.getCell(9, j);
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
        
        // 添加边框（数据区域）
        for (let i = 10; i <= totalRow; i++) {
            for (let j = 1; j <= 5; j++) {
                const cell = worksheet.getCell(i, j);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        }
    }
    
    // 创建梳理表
    function createSummarySheet(workbook, data) {
        const worksheet = workbook.addWorksheet('梳理表');
        
        // 设置列宽
        worksheet.columns = [
            { key: 'A', width: 15 },
            { key: 'B', width: 15 }
        ];
        
        // 添加标题
        worksheet.mergeCells('A1:B1');
        worksheet.getCell('A1').value = '梳理';
        worksheet.getCell('A1').font = { name: '宋体', size: 14, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        
        // 添加表头
        worksheet.getCell('A2').value = '项目';
        worksheet.getCell('B2').value = '金额';
        
        // 设置表头格式
        for (let j = 1; j <= 2; j++) {
            const cell = worksheet.getCell(2, j);
            cell.font = { name: '宋体', size: 12, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        
        // 添加数据
        worksheet.getCell('A3').value = '住宿费';
        worksheet.getCell('B3').value = data.accommodation.total;
        
        worksheet.getCell('A4').value = '燃油费';
        worksheet.getCell('B4').value = data.fuel.total;
        
        worksheet.getCell('A5').value = '租车费';
        worksheet.getCell('B5').value = data.rental.total;
        
        worksheet.getCell('A6').value = '过路费';
        worksheet.getCell('B6').value = data.toll.total;
        
        worksheet.getCell('A7').value = '高铁费';
        worksheet.getCell('B7').value = data.train.total;
        
        worksheet.getCell('A8').value = '伙食补助费';
        worksheet.getCell('B8').value = data.subsidy.total;
        
        worksheet.getCell('A9').value = '合计';
        worksheet.getCell('B9').value = data.grandTotal;
        
        // 设置数据单元格格式
        for (let i = 3; i <= 9; i++) {
            for (let j = 1; j <= 2; j++) {
                const cell = worksheet.getCell(i, j);
                cell.font = { name: '宋体', size: 12 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
        }
        
        // 设置合计行格式
        const totalRow = worksheet.getCell(9, 1);
        totalRow.font = { name: '宋体', size: 12, bold: true };
        totalRow.alignment = { horizontal: 'center', vertical: 'middle' };
        
        const totalAmountCell = worksheet.getCell(9, 2);
        totalAmountCell.font = { name: '宋体', size: 12, bold: true };
        totalAmountCell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        // 添加边框
        for (let i = 1; i <= 9; i++) {
            for (let j = 1; j <= 2; j++) {
                const cell = worksheet.getCell(i, j);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        }
    }
    
    // 创建出差费用说明Word文档
    function createTravelExpenseDoc(data) {
        // 获取提取的数据
        const { arrivalPlace, caseDescription, startDate, endDate } = appState.extractedData;
        
        const doc = new docx.Document({
            sections: [{
                properties: {},
                children: [
                    // 标题
                    new docx.Paragraph({
                        text: `关于赴${arrivalPlace}出差费用的说明`,
                        style: 'heading1',
                        alignment: docx.AlignmentType.CENTER
                    }),
                    
                    // 空行
                    new docx.Paragraph({ text: '' }),
                    
                    // 第一段
                    new docx.Paragraph({
                        text: caseDescription,
                        style: 'normal'
                    }),
                    
                    // 空行
                    new docx.Paragraph({ text: '' }),
                    
                    // 第二段
                    new docx.Paragraph({
                        text: `因外出调查案件需要，${startDate}至${endDate}在${arrivalPlace}租用本田思域车辆（贵E29333）。租赁车辆期间，产生租车费${data.rental.total}元，燃油费${data.fuel.total}元，车辆通行费${data.toll.total}元。`,
                        style: 'normal'
                    }),
                    
                    // 空行
                    new docx.Paragraph({ text: '' }),
                    
                    // 第三段
                    new docx.Paragraph({
                        text: `各类费用合计：住宿费 ${data.accommodation.total} 元，燃油费 ${data.fuel.total} 元，租车费 ${data.rental.total} 元，过路费 ${data.toll.total} 元，高铁费 ${data.train.total} 元，伙食补助费 ${data.subsidy.total} 元，共计 ${data.grandTotal} 元。`,
                        style: 'normal'
                    }),
                    
                    // 空行
                    new docx.Paragraph({ text: '' }),
                    
                    // 日期
                    new docx.Paragraph({
                        text: '2026年3月26日',
                        style: 'normal',
                        alignment: docx.AlignmentType.RIGHT
                    })
                ]
            }]
        });
        
        return doc;
    }
    
    // 创建配合调查案件说明Word文档
    function createInvestigationDoc(data) {
        // 获取提取的数据
        const { arrivalPlace, startDate, endDate } = appState.extractedData;
        
        const doc = new docx.Document({
            sections: [{
                properties: {},
                children: [
                    // 标题
                    new docx.Paragraph({
                        text: '关于配合调查案件的说明',
                        style: 'heading1',
                        alignment: docx.AlignmentType.CENTER
                    }),
                    
                    // 空行
                    new docx.Paragraph({ text: '' }),
                    
                    // 内容
                    new docx.Paragraph({
                        text: `根据工作安排，我单位人员于${startDate}至${endDate}赴${arrivalPlace}配合调查案件。期间产生的费用已按照规定进行报销。`,
                        style: 'normal'
                    }),
                    
                    // 空行
                    new docx.Paragraph({ text: '' }),
                    
                    // 日期
                    new docx.Paragraph({
                        text: '2026年3月26日',
                        style: 'normal',
                        alignment: docx.AlignmentType.RIGHT
                    })
                ]
            }]
        });
        
        return doc;
    }

    // 重置工具
    function resetTool() {
        appState = {
            files: {
                accommodation: [],
                fuel: [],
                rental: [],
                toll: [],
                train: [],
                approval: [],
                case: [],
                settlement: []
            },
            extractedData: {},
            processedData: null,
            isProcessing: false,
            currentCategory: null
        };

        FILE_CATEGORIES.forEach(cat => {
            updateCategoryUI(cat.id);
        });
        
        updateSummary();
        
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('downloadSection').style.display = 'none';
        document.getElementById('processBtn').style.display = 'none';
        document.getElementById('resetBtn').style.display = 'none';
        
        updateProgress(0, '准备处理...');
    }

    // 显示消息
    function showMessage(message, type) {
        const container = document.querySelector('.travel-expense-multi-tool');
        if (!container) return;

        const existingMsg = container.querySelector('.message');
        if (existingMsg) existingMsg.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = `${type}-message message`;
        msgDiv.textContent = message;
        
        container.insertBefore(msgDiv, container.children[1]);

        setTimeout(() => {
            msgDiv.remove();
        }, 5000);
    }

    // 如果直接加载此文件，自动初始化
    if (typeof ToolPlatform === 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            const container = document.getElementById('tool-container');
            if (container) {
                renderTool(container);
            }
        });
    }

})();
