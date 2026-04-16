// 差旅费智能识别工具 - 大模型OCR + 信息提取填写
// 注册到ToolPlatform

ToolPlatform.registerTool('travel-expense-intelligent', {
    name: '差旅费智能识别',
    description: '上传发票、支付记录、审批表等文件，自动识别提取关键信息并生成完整报销文档',
    icon: '📋',
    version: '1.0.0',
    author: 'AI Assistant',
    
    // 后端代理地址
    apiEndpoint: 'https://guibo-tool-platform.netlify.app/.netlify/functions/ocr-proxy',
    
    // 渲染工具界面
    render: function(container) {
        container.innerHTML = `
            <div class="travel-expense-intelligent">
                <style>
                    .travel-expense-intelligent {
                        padding: 20px;
                        max-width: 1400px;
                        margin: 0 auto;
                    }
                    .tei-header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .tei-header h2 {
                        color: #0066ff;
                        margin-bottom: 10px;
                    }
                    .tei-header p {
                        color: #666;
                        font-size: 14px;
                    }
                    .tei-upload-tabs {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 20px;
                        justify-content: center;
                    }
                    .tei-upload-tab {
                        padding: 10px 24px;
                        border: 1px solid #d9d9d9;
                        background: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.3s;
                        color: #666;
                    }
                    .tei-upload-tab:hover {
                        border-color: #0066ff;
                        color: #0066ff;
                    }
                    .tei-upload-tab.active {
                        background: #0066ff;
                        color: white;
                        border-color: #0066ff;
                    }
                    .tei-upload-content {
                        display: none;
                    }
                    .tei-upload-content.active {
                        display: block;
                    }
                    .tei-upload-section {
                        background: #f8fbff;
                        border: 2px dashed #0066ff;
                        border-radius: 12px;
                        padding: 40px;
                        text-align: center;
                        margin-bottom: 30px;
                        cursor: pointer;
                        transition: all 0.3s;
                    }
                    .tei-upload-section:hover {
                        background: #f0f7ff;
                        border-color: #0052cc;
                    }
                    .tei-upload-section.dragover {
                        background: #e6f2ff;
                        border-color: #0052cc;
                        transform: scale(1.02);
                    }
                    .tei-upload-icon {
                        font-size: 48px;
                        margin-bottom: 15px;
                    }
                    .tei-upload-text {
                        font-size: 16px;
                        color: #333;
                        margin-bottom: 10px;
                    }
                    .tei-upload-hint {
                        font-size: 13px;
                        color: #999;
                    }
                    .tei-file-types {
                        display: flex;
                        justify-content: center;
                        gap: 20px;
                        margin-top: 20px;
                        flex-wrap: wrap;
                    }
                    .tei-file-type {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 16px;
                        background: white;
                        border-radius: 20px;
                        font-size: 13px;
                        color: #666;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    }
                    .tei-files-list {
                        margin-bottom: 30px;
                    }
                    .tei-files-list h3 {
                        margin-bottom: 15px;
                        color: #333;
                    }
                    .tei-file-item {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 12px 16px;
                        background: white;
                        border: 1px solid #e1e8f5;
                        border-radius: 8px;
                        margin-bottom: 10px;
                    }
                    .tei-file-info {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    .tei-file-icon {
                        font-size: 24px;
                    }
                    .tei-file-name {
                        font-weight: 500;
                        color: #333;
                    }
                    .tei-file-size {
                        font-size: 12px;
                        color: #999;
                    }
                    .tei-file-meta {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .tei-file-path {
                        font-size: 11px;
                        color: #0066ff;
                        background: #f0f7ff;
                        padding: 2px 8px;
                        border-radius: 4px;
                        max-width: 300px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    .tei-file-actions {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .tei-file-type-select {
                        padding: 6px 12px;
                        border: 1px solid #d9d9d9;
                        border-radius: 6px;
                        font-size: 13px;
                        background: white;
                    }
                    .tei-file-remove {
                        color: #ff4d4f;
                        cursor: pointer;
                        padding: 6px;
                        border-radius: 4px;
                        transition: background 0.3s;
                    }
                    .tei-file-remove:hover {
                        background: #fff1f0;
                    }
                    .tei-actions {
                        display: flex;
                        gap: 15px;
                        justify-content: center;
                        margin-bottom: 30px;
                    }
                    .tei-btn {
                        padding: 12px 30px;
                        border: none;
                        border-radius: 8px;
                        font-size: 15px;
                        cursor: pointer;
                        transition: all 0.3s;
                        font-weight: 500;
                    }
                    .tei-btn-primary {
                        background: #0066ff;
                        color: white;
                    }
                    .tei-btn-primary:hover {
                        background: #0052cc;
                    }
                    .tei-btn-primary:disabled {
                        background: #ccc;
                        cursor: not-allowed;
                    }
                    .tei-btn-secondary {
                        background: #f0f2f5;
                        color: #666;
                    }
                    .tei-btn-secondary:hover {
                        background: #e4e6e9;
                    }
                    .tei-progress {
                        display: none;
                        background: white;
                        border-radius: 12px;
                        padding: 30px;
                        margin-bottom: 30px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    }
                    .tei-progress.active {
                        display: block;
                    }
                    .tei-progress-bar {
                        height: 8px;
                        background: #f0f2f5;
                        border-radius: 4px;
                        overflow: hidden;
                        margin-bottom: 15px;
                    }
                    .tei-progress-fill {
                        height: 100%;
                        background: linear-gradient(90deg, #0066ff, #00c6ff);
                        border-radius: 4px;
                        transition: width 0.3s;
                    }
                    .tei-progress-text {
                        text-align: center;
                        color: #666;
                        font-size: 14px;
                    }
                    .tei-results {
                        display: none;
                    }
                    .tei-results.active {
                        display: block;
                    }
                    .tei-results h3 {
                        margin-bottom: 20px;
                        color: #333;
                    }
                    .tei-tabs {
                        display: flex;
                        gap: 5px;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #f0f2f5;
                        overflow-x: auto;
                    }
                    .tei-tab {
                        padding: 12px 20px;
                        border: none;
                        background: transparent;
                        color: #666;
                        cursor: pointer;
                        font-size: 14px;
                        white-space: nowrap;
                        border-bottom: 2px solid transparent;
                        margin-bottom: -2px;
                        transition: all 0.3s;
                    }
                    .tei-tab:hover {
                        color: #0066ff;
                    }
                    .tei-tab.active {
                        color: #0066ff;
                        border-bottom-color: #0066ff;
                        font-weight: 500;
                    }
                    .tei-tab-content {
                        display: none;
                    }
                    .tei-tab-content.active {
                        display: block;
                    }
                    .tei-data-table {
                        width: 100%;
                        border-collapse: collapse;
                        background: white;
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    }
                    .tei-data-table th,
                    .tei-data-table td {
                        padding: 12px 16px;
                        text-align: left;
                        border-bottom: 1px solid #f0f2f5;
                    }
                    .tei-data-table th {
                        background: #f8fbff;
                        font-weight: 600;
                        color: #333;
                        font-size: 13px;
                    }
                    .tei-data-table td {
                        font-size: 14px;
                        color: #666;
                    }
                    .tei-data-table tr:hover td {
                        background: #f8fbff;
                    }
                    .tei-export-section {
                        margin-top: 30px;
                        padding: 20px;
                        background: #f8fbff;
                        border-radius: 12px;
                    }
                    .tei-export-section h4 {
                        margin-bottom: 15px;
                        color: #333;
                    }
                    .tei-export-buttons {
                        display: flex;
                        gap: 10px;
                        flex-wrap: wrap;
                    }
                    .tei-export-btn {
                        padding: 10px 20px;
                        border: 1px solid #0066ff;
                        background: white;
                        color: #0066ff;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 13px;
                        transition: all 0.3s;
                    }
                    .tei-export-btn:hover {
                        background: #0066ff;
                        color: white;
                    }
                    .tei-info-panel {
                        background: #fffbe6;
                        border: 1px solid #ffe58f;
                        border-radius: 8px;
                        padding: 16px;
                        margin-bottom: 20px;
                    }
                    .tei-info-panel h4 {
                        color: #d48806;
                        margin-bottom: 10px;
                        font-size: 14px;
                    }
                    .tei-info-panel ul {
                        margin: 0;
                        padding-left: 20px;
                        color: #666;
                        font-size: 13px;
                        line-height: 1.8;
                    }
                    .tei-status-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        padding: 4px 10px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 500;
                    }
                    .tei-status-pending {
                        background: #fffbe6;
                        color: #d48806;
                    }
                    .tei-status-processing {
                        background: #e6f7ff;
                        color: #0066ff;
                    }
                    .tei-status-success {
                        background: #f6ffed;
                        color: #52c41a;
                    }
                    .tei-status-error {
                        background: #fff1f0;
                        color: #ff4d4f;
                    }
                    .tei-extracted-info {
                        background: white;
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    }
                    .tei-extracted-info h4 {
                        margin-bottom: 15px;
                        color: #333;
                        font-size: 16px;
                    }
                    .tei-info-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                        gap: 15px;
                    }
                    .tei-info-item {
                        display: flex;
                        flex-direction: column;
                        gap: 5px;
                    }
                    .tei-info-label {
                        font-size: 12px;
                        color: #999;
                    }
                    .tei-info-value {
                        font-size: 14px;
                        color: #333;
                        font-weight: 500;
                    }
                    .tei-edit-input {
                        padding: 6px 10px;
                        border: 1px solid #d9d9d9;
                        border-radius: 4px;
                        font-size: 14px;
                        width: 100%;
                    }
                    .tei-edit-input:focus {
                        border-color: #0066ff;
                        outline: none;
                    }
                    .tei-match-result {
                        background: #f6ffed;
                        border: 1px solid #b7eb8f;
                        border-radius: 8px;
                        padding: 15px;
                        margin-top: 15px;
                    }
                    .tei-match-result h5 {
                        color: #52c41a;
                        margin-bottom: 10px;
                    }
                    .tei-match-list {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .tei-match-item {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-size: 13px;
                        color: #666;
                    }
                    .tei-match-icon {
                        color: #52c41a;
                    }
                </style>
                
                <div class="tei-header">
                    <h2>📋 差旅费智能识别</h2>
                    <p>上传发票、支付记录、审批表等文件，自动识别提取关键信息并生成完整报销文档</p>
                    <div class="tei-engine-info" style="margin-top: 10px; padding: 8px 16px; background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 4px; display: inline-block;">
                        <span style="color: #52c41a; font-size: 13px;">🤖 OCR识别引擎：智谱GLM-4-Flash大模型</span>
                    </div>
                </div>
                
                <div class="tei-info-panel">
                    <h4>📋 使用说明</h4>
                    <ul>
                        <li>支持上传PDF发票、XML发票、图片（发票截图、支付记录、审批表等）</li>
                        <li>系统会自动识别文件类型并提取关键信息</li>
                        <li>识别完成后可预览、编辑提取的信息</li>
                        <li>一键生成业务事项审批单、伙食补助费领取表、租车费用审批表、梳理表、出差费用说明等文档</li>
                    </ul>
                </div>
                
                <div class="tei-upload-tabs">
                    <button class="tei-upload-tab active" onclick="TravelExpenseIntelligent.switchUploadTab('file')">📄 上传文件</button>
                    <button class="tei-upload-tab" onclick="TravelExpenseIntelligent.switchUploadTab('folder')">📁 上传文件夹</button>
                </div>

                <div class="tei-upload-content active" id="upload-file">
                    <div class="tei-upload-section" id="teiUploadArea">
                        <div class="tei-upload-icon">📄</div>
                        <div class="tei-upload-text">点击或拖拽文件到此处上传</div>
                        <div class="tei-upload-hint">支持 PDF、XML、JPG、PNG 格式</div>
                        <div class="tei-file-types">
                            <div class="tei-file-type">📄 PDF发票</div>
                            <div class="tei-file-type">📋 XML发票</div>
                            <div class="tei-file-type">🖼️ 发票截图</div>
                            <div class="tei-file-type">💳 支付记录</div>
                            <div class="tei-file-type">📋 审批表</div>
                        </div>
                        <input type="file" id="teiFileInput" multiple accept=".pdf,.xml,image/*" style="display: none;">
                    </div>
                </div>

                <div class="tei-upload-content" id="upload-folder">
                    <div class="tei-upload-section" id="teiFolderUploadArea">
                        <div class="tei-upload-icon">📁</div>
                        <div class="tei-upload-text">点击或拖拽文件夹到此处上传</div>
                        <div class="tei-upload-hint">将上传文件夹内的所有 PDF、XML、图片文件</div>
                        <div class="tei-file-types">
                            <div class="tei-file-type">📁 整个文件夹</div>
                            <div class="tei-file-type">📄 自动识别文件</div>
                            <div class="tei-file-type">🔄 保持目录结构</div>
                        </div>
                        <input type="file" id="teiFolderInput" webkitdirectory directory multiple style="display: none;">
                    </div>
                </div>
                
                <div class="tei-files-list" id="teiFilesList" style="display: none;">
                    <h3>已选择的文件</h3>
                    <div id="teiFilesContainer"></div>
                </div>
                
                <div class="tei-actions" id="teiActions" style="display: none;">
                    <button class="tei-btn tei-btn-primary" id="teiStartBtn" onclick="TravelExpenseIntelligent.startProcessing()">
                        🔍 开始识别
                    </button>
                    <button class="tei-btn tei-btn-secondary" onclick="TravelExpenseIntelligent.clearFiles()">
                        🗑️ 清空文件
                    </button>
                </div>
                
                <div class="tei-progress" id="teiProgress">
                    <div class="tei-progress-bar">
                        <div class="tei-progress-fill" id="teiProgressFill" style="width: 0%"></div>
                    </div>
                    <div class="tei-progress-text" id="teiProgressText">正在初始化...</div>
                </div>
                
                <div class="tei-results" id="teiResults">
                    <h3>📊 识别结果</h3>
                    
                    <div class="tei-tabs" id="teiTabs">
                        <button class="tei-tab active" onclick="TravelExpenseIntelligent.switchTab('overview')">总览</button>
                        <button class="tei-tab" onclick="TravelExpenseIntelligent.switchTab('invoices')">发票信息</button>
                        <button class="tei-tab" onclick="TravelExpenseIntelligent.switchTab('payments')">支付记录</button>
                        <button class="tei-tab" onclick="TravelExpenseIntelligent.switchTab('travels')">出差信息</button>
                        <button class="tei-tab" onclick="TravelExpenseIntelligent.switchTab('cases')">案件信息</button>
                        <button class="tei-tab" onclick="TravelExpenseIntelligent.switchTab('car')">租车信息</button>
                    </div>
                    
                    <div class="tei-tab-content active" id="tab-overview">
                        <div class="tei-extracted-info">
                            <h4>提取的关键信息</h4>
                            <div class="tei-info-grid" id="overviewInfoGrid"></div>
                        </div>
                        <div class="tei-match-result" id="matchResult" style="display: none;">
                            <h5>✅ 匹配结果</h5>
                            <div class="tei-match-list" id="matchList"></div>
                        </div>
                    </div>
                    
                    <div class="tei-tab-content" id="tab-invoices">
                        <table class="tei-data-table">
                            <thead>
                                <tr>
                                    <th>发票号码</th>
                                    <th>开票日期</th>
                                    <th>销售方</th>
                                    <th>金额</th>
                                    <th>类型</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody id="invoicesTableBody"></tbody>
                        </table>
                    </div>
                    
                    <div class="tei-tab-content" id="tab-payments">
                        <table class="tei-data-table">
                            <thead>
                                <tr>
                                    <th>支付时间</th>
                                    <th>支付金额</th>
                                    <th>收款方</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody id="paymentsTableBody"></tbody>
                        </table>
                    </div>
                    
                    <div class="tei-tab-content" id="tab-travels">
                        <div class="tei-extracted-info">
                            <h4>出差审批信息</h4>
                            <div class="tei-info-grid" id="travelInfoGrid"></div>
                        </div>
                    </div>
                    
                    <div class="tei-tab-content" id="tab-cases">
                        <div class="tei-extracted-info">
                            <h4>案件信息</h4>
                            <div class="tei-info-grid" id="caseInfoGrid"></div>
                        </div>
                    </div>
                    
                    <div class="tei-tab-content" id="tab-car">
                        <div class="tei-extracted-info">
                            <h4>租车信息</h4>
                            <div class="tei-info-grid" id="carInfoGrid"></div>
                        </div>
                    </div>
                    
                    <div class="tei-export-section">
                        <h4>📥 导出文档</h4>
                        <div class="tei-export-buttons">
                            <button class="tei-export-btn" onclick="TravelExpenseIntelligent.exportDocument('businessApproval')">
                                📄 业务事项审批单
                            </button>
                            <button class="tei-export-btn" onclick="TravelExpenseIntelligent.exportDocument('mealSubsidy')">
                                🍽️ 伙食补助费领取表
                            </button>
                            <button class="tei-export-btn" onclick="TravelExpenseIntelligent.exportDocument('carRental')">
                                🚗 租车费用审批表
                            </button>
                            <button class="tei-export-btn" onclick="TravelExpenseIntelligent.exportDocument('summary')">
                                📊 梳理表
                            </button>
                            <button class="tei-export-btn" onclick="TravelExpenseIntelligent.exportDocument('expenseNote')">
                                📝 出差费用说明
                            </button>
                            <button class="tei-export-btn" onclick="TravelExpenseIntelligent.exportDocument('cooperationNote')">
                                🤝 配合调查说明
                            </button>
                            <button class="tei-export-btn" onclick="TravelExpenseIntelligent.exportAll()">
                                📦 导出全部
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.initEventListeners();
    },
    
    // 初始化事件监听
    initEventListeners: function() {
        // 文件上传区域
        const uploadArea = document.getElementById('teiUploadArea');
        const fileInput = document.getElementById('teiFileInput');

        uploadArea.addEventListener('click', () => fileInput.click());

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
            this.handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // 文件夹上传区域
        const folderUploadArea = document.getElementById('teiFolderUploadArea');
        const folderInput = document.getElementById('teiFolderInput');

        if (folderUploadArea && folderInput) {
            folderUploadArea.addEventListener('click', () => folderInput.click());

            folderUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                folderUploadArea.classList.add('dragover');
            });

            folderUploadArea.addEventListener('dragleave', () => {
                folderUploadArea.classList.remove('dragover');
            });

            folderUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                folderUploadArea.classList.remove('dragover');
                this.handleFolderDrop(e);
            });

            folderInput.addEventListener('change', (e) => {
                this.handleFolderFiles(e.target.files);
            });
        }
    },

    // 切换上传方式标签
    switchUploadTab: function(tab) {
        document.querySelectorAll('.tei-upload-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tei-upload-content').forEach(c => c.classList.remove('active'));

        event.target.classList.add('active');
        document.getElementById(`upload-${tab}`).classList.add('active');
    },

    // 处理文件夹拖拽
    handleFolderDrop: async function(e) {
        const items = e.dataTransfer.items;
        if (!items) return;

        const files = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i].webkitGetAsEntry();
            if (item) {
                await this.traverseFileTree(item, files);
            }
        }

        this.processFileList(files);
    },

    // 处理文件夹选择
    handleFolderFiles: function(fileList) {
        const files = Array.from(fileList).filter(file => this.isValidFile(file));
        this.processFileList(files);
    },

    // 递归遍历文件夹
    traverseFileTree: function(item, files) {
        return new Promise((resolve) => {
            if (item.isFile) {
                item.file(file => {
                    if (this.isValidFile(file)) {
                        files.push(file);
                    }
                    resolve();
                });
            } else if (item.isDirectory) {
                const dirReader = item.createReader();
                dirReader.readEntries(async entries => {
                    for (let entry of entries) {
                        await this.traverseFileTree(entry, files);
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    },

    // 检查是否为有效文件
    isValidFile: function(file) {
        const validExtensions = ['pdf', 'xml', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        const ext = file.name.split('.').pop().toLowerCase();
        return validExtensions.includes(ext);
    },

    // 处理文件列表
    processFileList: function(files) {
        const newFiles = files.map(file => ({
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            category: this.detectFileCategory(file),
            status: 'pending',
            relativePath: file.webkitRelativePath || file.name
        }));

        this.files = [...this.files, ...newFiles];
        this.renderFileList();
        this.updateUI();
    },
    
    // 存储的文件列表
    files: [],
    
    // 提取的数据
    extractedData: {
        invoices: [],
        payments: [],
        caseInfo: {},
        travelInfo: {},
        carInfo: {},
        trainTickets: [],
        fuelInvoices: [],
        tollInvoices: [],
        hotelInvoices: []
    },
    
    // 处理文件选择
    handleFiles: function(fileList) {
        const files = Array.from(fileList);
        this.processFileList(files);
    },
    
    // 检测文件类别
    detectFileCategory: function(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const name = file.name.toLowerCase();
        
        if (ext === 'xml') return 'xml_invoice';
        if (ext === 'pdf') return 'pdf_invoice';
        if (file.type.startsWith('image/')) {
            if (name.includes('支付') || name.includes('付款') || name.includes('转账')) return 'payment';
            if (name.includes('出差') || name.includes('审批')) return 'travel_approval';
            if (name.includes('办案') || name.includes('外出')) return 'case_approval';
            if (name.includes('立案')) return 'case_report';
            if (name.includes('租车') || name.includes('结算')) return 'car_rental';
            return 'image';
        }
        return 'unknown';
    },
    
    // 渲染文件列表
    renderFileList: function() {
        const container = document.getElementById('teiFilesContainer');
        const listSection = document.getElementById('teiFilesList');

        if (this.files.length === 0) {
            listSection.style.display = 'none';
            return;
        }

        listSection.style.display = 'block';

        container.innerHTML = this.files.map(file => `
            <div class="tei-file-item" data-id="${file.id}">
                <div class="tei-file-info">
                    <span class="tei-file-icon">${this.getFileIcon(file.category)}</span>
                    <div>
                        <div class="tei-file-name">${file.name}</div>
                        <div class="tei-file-meta">
                            <span class="tei-file-size">${this.formatFileSize(file.size)}</span>
                            ${file.relativePath && file.relativePath !== file.name ? `<span class="tei-file-path">📁 ${file.relativePath}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="tei-file-actions">
                    <span class="tei-status-badge tei-status-${file.status}">
                        ${this.getStatusText(file.status)}
                    </span>
                    <select class="tei-file-type-select" onchange="TravelExpenseIntelligent.updateFileCategory(${file.id}, this.value)">
                        <option value="auto" ${file.category === 'auto' ? 'selected' : ''}>自动识别</option>
                        <option value="invoice" ${file.category === 'invoice' ? 'selected' : ''}>发票</option>
                        <option value="payment" ${file.category === 'payment' ? 'selected' : ''}>支付记录</option>
                        <option value="case_approval" ${file.category === 'case_approval' ? 'selected' : ''}>办案审批</option>
                        <option value="travel_approval" ${file.category === 'travel_approval' ? 'selected' : ''}>出差审批</option>
                        <option value="case_report" ${file.category === 'case_report' ? 'selected' : ''}>立案报告</option>
                        <option value="car_rental" ${file.category === 'car_rental' ? 'selected' : ''}>租车结算</option>
                    </select>
                    <span class="tei-file-remove" onclick="TravelExpenseIntelligent.removeFile(${file.id})">🗑️</span>
                </div>
            </div>
        `).join('');
    },
    
    // 获取文件图标
    getFileIcon: function(category) {
        const icons = {
            'xml_invoice': '📋',
            'pdf_invoice': '📄',
            'payment': '💳',
            'case_approval': '📋',
            'travel_approval': '📋',
            'case_report': '📋',
            'car_rental': '🚗',
            'image': '🖼️',
            'unknown': '📎'
        };
        return icons[category] || '📎';
    },
    
    // 获取状态文本
    getStatusText: function(status) {
        const texts = {
            'pending': '⏳ 待处理',
            'processing': '🔄 识别中',
            'success': '✅ 已完成',
            'error': '❌ 失败'
        };
        return texts[status] || '⏳ 待处理';
    },
    
    // 格式化文件大小
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // 更新文件类别
    updateFileCategory: function(fileId, category) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
            file.category = category;
        }
    },
    
    // 移除文件
    removeFile: function(fileId) {
        this.files = this.files.filter(f => f.id !== fileId);
        this.renderFileList();
        this.updateUI();
    },
    
    // 清空文件
    clearFiles: function() {
        this.files = [];
        this.renderFileList();
        this.updateUI();
        document.getElementById('teiResults').classList.remove('active');
    },
    
    // 更新UI状态
    updateUI: function() {
        const actions = document.getElementById('teiActions');
        actions.style.display = this.files.length > 0 ? 'flex' : 'none';
    },
    
    // 开始处理
    startProcessing: async function() {
        if (this.files.length === 0) {
            alert('请先上传文件');
            return;
        }
        
        const progressDiv = document.getElementById('teiProgress');
        const progressFill = document.getElementById('teiProgressFill');
        const progressText = document.getElementById('teiProgressText');
        const startBtn = document.getElementById('teiStartBtn');
        
        progressDiv.classList.add('active');
        startBtn.disabled = true;
        
        // 重置提取数据
        this.extractedData = {
            invoices: [],
            payments: [],
            caseInfo: {},
            travelInfo: {},
            carInfo: {},
            trainTickets: [],
            fuelInvoices: [],
            tollInvoices: [],
            hotelInvoices: []
        };
        
        const totalFiles = this.files.length;
        
        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            const progress = ((i + 1) / totalFiles) * 100;
            
            progressFill.style.width = progress + '%';
            progressText.textContent = `正在识别 ${file.name} (${i + 1}/${totalFiles})...`;
            
            file.status = 'processing';
            this.renderFileList();
            
            try {
                const result = await this.processFile(file);
                file.status = 'success';
                file.extractedData = result;
                this.categorizeExtractedData(result, file.category);
                
                // 添加延迟避免429错误
                if (i < totalFiles - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error('Processing error:', error);
                file.status = 'error';
                file.error = error.message;
                
                // 出错后也添加延迟
                if (i < totalFiles - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            this.renderFileList();
        }
        
        progressText.textContent = '识别完成！';
        startBtn.disabled = false;
        
        // 执行信息匹配逻辑
        this.matchData();
        
        // 显示结果
        this.displayResults();
        
        setTimeout(() => {
            progressDiv.classList.remove('active');
        }, 1500);
    },
    
    // 处理单个文件
    processFile: async function(file) {
        const base64Data = await this.fileToBase64(file.file);
        
        // 确定提取类型
        let extractType = 'auto';
        if (file.category === 'payment') extractType = 'payment';
        else if (file.category === 'case_approval') extractType = 'caseApproval';
        else if (file.category === 'travel_approval') extractType = 'travelApproval';
        else if (file.category === 'case_report') extractType = 'caseReport';
        else if (file.category === 'car_rental') extractType = 'carRental';
        else if (file.category === 'invoice' || file.category === 'xml_invoice' || file.category === 'pdf_invoice') {
            extractType = 'invoice';
        }
        
        // 调用后端代理
        const response = await fetch(this.apiEndpoint || '/api/ocr-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: [{
                    base64Data: base64Data,
                    mimeType: file.type || 'application/octet-stream',
                    fileName: file.name
                }],
                extractType: extractType
            })
        });
        
        if (!response.ok) {
            throw new Error('OCR request failed');
        }
        
        const data = await response.json();
        console.log('OCR API Response:', data);
        return data.data && data.data.length > 0 ? data.data[0] : null;
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
    
    // 分类提取的数据
    categorizeExtractedData: function(result, category) {
        console.log('Categorizing result:', result);
        if (!result || !result.extractedData) {
            console.warn('No extractedData found in result');
            return;
        }
        
        const data = result.extractedData;
        console.log('Extracted data:', data);
        
        // 根据数据内容自动分类
        if (data.invoiceNumber || data.totalAmount) {
            // 判断是否为火车票
            if (data.isTrainTicket || (data.trainInfo && data.trainInfo.departure)) {
                this.extractedData.trainTickets.push({
                    ...data,
                    fileName: result.fileName
                });
            } else if (data.sellerName && data.sellerName.includes('油') || data.sellerName && data.sellerName.includes('石化')) {
                this.extractedData.fuelInvoices.push({
                    ...data,
                    fileName: result.fileName
                });
            } else if (data.sellerName && (data.sellerName.includes('高速') || data.sellerName.includes('路桥'))) {
                this.extractedData.tollInvoices.push({
                    ...data,
                    fileName: result.fileName
                });
            } else if (data.sellerName && (data.sellerName.includes('酒店') || data.sellerName.includes('宾馆') || data.sellerName.includes('住宿'))) {
                this.extractedData.hotelInvoices.push({
                    ...data,
                    fileName: result.fileName
                });
            } else {
                this.extractedData.invoices.push({
                    ...data,
                    fileName: result.fileName
                });
            }
        }
        
        // 支付记录（支持中英文字段名）
        if (data.paymentAmount || data.payee || data['支付金额'] || data['收款方']) {
            this.extractedData.payments.push({
                ...data,
                fileName: result.fileName
            });
        }
        
        // 案件信息（支持中英文字段名）
        if (data.caseName || data.caseLocation || data['案件名称'] || data['办案地点']) {
            this.extractedData.caseInfo = { ...this.extractedData.caseInfo, ...data };
        }
        
        // 出差信息（支持中英文字段名）
        if (data.travelers || data.destination || data['出差人'] || data['到达地']) {
            this.extractedData.travelInfo = { ...this.extractedData.travelInfo, ...data };
        }
        
        // 租车信息（支持中英文字段名）
        if (data.plateNumber || data.vehicleInfo || data['车牌号码'] || data['车辆信息']) {
            this.extractedData.carInfo = { ...this.extractedData.carInfo, ...data };
        }
    },
    
    // 匹配数据
    matchData: function() {
        const { invoices, payments } = this.extractedData;
        
        // 发票与支付记录匹配
        invoices.forEach(invoice => {
            invoice.matchedPayment = null;
            
            // 1. 通过销售方名称和收款方匹配
            const matchBySeller = payments.find(p => 
                p.payee && invoice.sellerName && 
                (p.payee.includes(invoice.sellerName) || invoice.sellerName.includes(p.payee))
            );
            
            if (matchBySeller) {
                invoice.matchedPayment = matchBySeller;
                return;
            }
            
            // 2. 通过金额匹配（允许小误差）
            const invoiceAmount = parseFloat(invoice.totalAmount) || 0;
            const matchByAmount = payments.find(p => {
                const paymentAmount = parseFloat(p.paymentAmount) || 0;
                return Math.abs(invoiceAmount - paymentAmount) < 1;
            });
            
            if (matchByAmount) {
                invoice.matchedPayment = matchByAmount;
            }
        });
    },
    
    // 显示结果
    displayResults: function() {
        const resultsDiv = document.getElementById('teiResults');
        resultsDiv.classList.add('active');
        
        this.renderOverview();
        this.renderInvoicesTable();
        this.renderPaymentsTable();
        this.renderTravelInfo();
        this.renderCaseInfo();
        this.renderCarInfo();
    },
    
    // 渲染总览
    renderOverview: function() {
        const grid = document.getElementById('overviewInfoGrid');
        const data = this.extractedData;
        
        // 计算汇总数据
        const trainTotal = data.trainTickets.reduce((sum, t) => sum + (parseFloat(t.ticketPrice) || parseFloat(t.totalAmount) || 0), 0);
        const fuelTotal = data.fuelInvoices.reduce((sum, f) => sum + (parseFloat(f.fuelAmount) || parseFloat(f.totalAmount) || 0), 0);
        const tollTotal = data.tollInvoices.reduce((sum, t) => sum + (parseFloat(t.tollAmount) || parseFloat(t.totalAmount) || 0), 0);
        const carTotal = data.carInfo.totalCost ? parseFloat(data.carInfo.totalCost) : 0;
        
        // 计算伙食补助
        const travelers = data.travelInfo.travelers || [];
        const externalPersonnel = data.travelInfo.externalPersonnel || '';
        const allPersons = [...travelers];
        if (externalPersonnel) allPersons.push(...externalPersonnel.split(/[,，、]/));
        
        // 计算天数
        let days = 0;
        if (data.travelInfo.startDate && data.travelInfo.endDate) {
            const start = new Date(data.travelInfo.startDate);
            const end = new Date(data.travelInfo.endDate);
            days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
        }
        
        const mealSubsidyTotal = allPersons.length * days * 100;
        const totalExpense = trainTotal + fuelTotal + tollTotal + carTotal + mealSubsidyTotal;
        
        // 保存计算结果
        this.calculatedData = {
            trainTotal,
            fuelTotal,
            tollTotal,
            carTotal,
            mealSubsidyTotal,
            totalExpense,
            days,
            personCount: allPersons.length
        };
        
        grid.innerHTML = `
            <div class="tei-info-item">
                <span class="tei-info-label">案件名称</span>
                <span class="tei-info-value">${data.caseInfo.caseName || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">办案地点</span>
                <span class="tei-info-value">${data.caseInfo.caseLocation || data.travelInfo.destination || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">出差人员</span>
                <span class="tei-info-value">${travelers.join(', ') || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">出差日期</span>
                <span class="tei-info-value">${data.travelInfo.startDate || '未识别'} 至 ${data.travelInfo.endDate || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">高铁票总额</span>
                <span class="tei-info-value">¥${trainTotal.toFixed(2)}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">燃油费总额</span>
                <span class="tei-info-value">¥${fuelTotal.toFixed(2)}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">过路费总额</span>
                <span class="tei-info-value">¥${tollTotal.toFixed(2)}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">租车费用</span>
                <span class="tei-info-value">¥${carTotal.toFixed(2)}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">伙食补助</span>
                <span class="tei-info-value">¥${mealSubsidyTotal.toFixed(2)} (${allPersons.length}人×${days}天×100元)</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">差旅费总计</span>
                <span class="tei-info-value" style="color: #0066ff; font-size: 18px;">¥${totalExpense.toFixed(2)}</span>
            </div>
        `;
        
        // 显示匹配结果
        const matchResult = document.getElementById('matchResult');
        const matchList = document.getElementById('matchList');
        
        const matchedInvoices = data.invoices.filter(i => i.matchedPayment);
        if (matchedInvoices.length > 0) {
            matchResult.style.display = 'block';
            matchList.innerHTML = matchedInvoices.map(i => `
                <div class="tei-match-item">
                    <span class="tei-match-icon">✓</span>
                    <span>发票 ${i.invoiceNumber || '未知'} (${i.sellerName || '未知'}) 匹配支付记录 ¥${i.matchedPayment.paymentAmount}</span>
                </div>
            `).join('');
        }
    },
    
    // 渲染发票表格
    renderInvoicesTable: function() {
        const tbody = document.getElementById('invoicesTableBody');
        const allInvoices = [
            ...this.extractedData.invoices,
            ...this.extractedData.trainTickets,
            ...this.extractedData.fuelInvoices,
            ...this.extractedData.tollInvoices,
            ...this.extractedData.hotelInvoices
        ];
        
        tbody.innerHTML = allInvoices.map(inv => `
            <tr>
                <td>${inv.invoiceNumber || '-'}</td>
                <td>${inv.invoiceDate || '-'}</td>
                <td>${inv.sellerName || '-'}</td>
                <td>¥${inv.totalAmount || '-'}</td>
                <td>${inv.isTrainTicket ? '火车票' : (inv.sellerName && inv.sellerName.includes('油') ? '燃油费' : '发票')}</td>
                <td>
                    ${inv.matchedPayment ? '<span style="color: #52c41a;">✓ 已匹配</span>' : '<span style="color: #999;">-</span>'}
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align: center; color: #999;">暂无发票数据</td></tr>';
    },
    
    // 渲染支付记录表格
    renderPaymentsTable: function() {
        const tbody = document.getElementById('paymentsTableBody');
        
        tbody.innerHTML = this.extractedData.payments.map(pay => `
            <tr>
                <td>${pay.paymentTime || '-'}</td>
                <td>¥${pay.paymentAmount || '-'}</td>
                <td>${pay.payee || '-'}</td>
                <td>-</td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align: center; color: #999;">暂无支付记录</td></tr>';
    },
    
    // 渲染出差信息
    renderTravelInfo: function() {
        const grid = document.getElementById('travelInfoGrid');
        const data = this.extractedData.travelInfo;
        
        grid.innerHTML = `
            <div class="tei-info-item">
                <span class="tei-info-label">出差人</span>
                <span class="tei-info-value">${(data.travelers || []).join(', ') || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">行业外人员</span>
                <span class="tei-info-value">${data.externalPersonnel || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">出差起始日期</span>
                <span class="tei-info-value">${data.startDate || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">出差截止日期</span>
                <span class="tei-info-value">${data.endDate || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">到达地</span>
                <span class="tei-info-value">${data.destination || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">申请说明</span>
                <span class="tei-info-value">${data.applicationNote || '未识别'}</span>
            </div>
        `;
    },
    
    // 渲染案件信息
    renderCaseInfo: function() {
        const grid = document.getElementById('caseInfoGrid');
        const data = this.extractedData.caseInfo;
        
        grid.innerHTML = `
            <div class="tei-info-item">
                <span class="tei-info-label">案件名称</span>
                <span class="tei-info-value">${data.caseName || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">办案地点</span>
                <span class="tei-info-value">${data.caseLocation || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">联合办案单位</span>
                <span class="tei-info-value">${data.cooperatingUnit || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">案件情况</span>
                <span class="tei-info-value">${data.caseDescription || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">查获信息</span>
                <span class="tei-info-value">${data.seizureInfo || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">案件编号</span>
                <span class="tei-info-value">${data.caseNumber || '未识别'}</span>
            </div>
        `;
    },
    
    // 渲染租车信息
    renderCarInfo: function() {
        const grid = document.getElementById('carInfoGrid');
        const data = this.extractedData.carInfo;
        
        grid.innerHTML = `
            <div class="tei-info-item">
                <span class="tei-info-label">车牌号码</span>
                <span class="tei-info-value">${data.plateNumber || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">取车时间</span>
                <span class="tei-info-value">${data.pickupDate || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">还车时间</span>
                <span class="tei-info-value">${data.returnDate || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">车辆信息</span>
                <span class="tei-info-value">${data.vehicleInfo || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">费用总金额</span>
                <span class="tei-info-value">¥${data.totalCost || '未识别'}</span>
            </div>
            <div class="tei-info-item">
                <span class="tei-info-label">租车公司</span>
                <span class="tei-info-value">${data.rentalCompany || '未识别'}</span>
            </div>
        `;
    },
    
    // 切换标签页
    switchTab: function(tabName) {
        document.querySelectorAll('.tei-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tei-tab-content').forEach(content => content.classList.remove('active'));
        
        event.target.classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
    },
    
    // 导出文档
    exportDocument: function(type) {
        switch(type) {
            case 'businessApproval':
                this.exportBusinessApproval();
                break;
            case 'mealSubsidy':
                this.exportMealSubsidy();
                break;
            case 'carRental':
                this.exportCarRental();
                break;
            case 'summary':
                this.exportSummary();
                break;
            case 'expenseNote':
                this.exportExpenseNote();
                break;
            case 'cooperationNote':
                this.exportCooperationNote();
                break;
        }
    },
    
    // 导出业务事项审批单
    exportBusinessApproval: function() {
        const data = this.extractedData;
        const calc = this.calculatedData;
        const caseInfo = data.caseInfo;
        const travelInfo = data.travelInfo;
        
        // 计算Z（支付时间最晚时间加5日）
        let zDate = '';
        if (data.payments.length > 0) {
            const latestPayment = data.payments.reduce((latest, p) => {
                const date = new Date(p.paymentTime);
                return date > latest ? date : latest;
            }, new Date(0));
            latestPayment.setDate(latestPayment.getDate() + 5);
            zDate = this.formatDate(latestPayment);
        }
        
        // 构建事项说明
        let description = caseInfo.caseDescription || '';
        if (description && calc.trainTotal > 0) description += `，期间产生高铁费${calc.trainTotal.toFixed(2)}元`;
        if (calc.carTotal > 0) description += `；车辆租金费${calc.carTotal.toFixed(2)}元`;
        if (calc.fuelTotal > 0) description += `；燃油费${calc.fuelTotal.toFixed(2)}元`;
        if (calc.tollTotal > 0) description += `；过路费${calc.tollTotal.toFixed(2)}元`;
        if (calc.mealSubsidyTotal > 0) description += `；伙食补助费每人每天100元共计${calc.mealSubsidyTotal.toFixed(2)}元`;
        description += `，以上共计出差费用${calc.totalExpense.toFixed(2)}元。`;
        
        const wb = XLSX.utils.book_new();
        
        // 创建审批单数据
        const wsData = [
            ['业务事项审批单'],
            ['事项名称', `赴${caseInfo.caseLocation || travelInfo.destination || ''}调查案件差旅费`, '', '经办人', ''],
            ['部门名称', '专卖科', '申请日期', zDate, '预算员', ''],
            ['金额', `大写：${this.numberToChinese(calc.totalExpense)}`, '', '', `小写：￥${calc.totalExpense.toFixed(2)}元`, ''],
            ['事项具体说明：' + description],
            [''],
            [''],
            [''],
            ['部门负责人\n审批签字', '', '主管领导\n审批签字', ''],
            ['财务主管领导\n审批签字', '', '主要负责人\n审批签字', ''],
            ['备注：本审批单不包含财务管理共享中心系统内设的出差审批、自办会议审批、举报费申报、协同办案费申报和自办培训审批事项。']
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // 设置合并单元格
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
            { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } },
            { s: { r: 1, c: 4 }, e: { r: 1, c: 5 } },
            { s: { r: 2, c: 1 }, e: { r: 2, c: 1 } },
            { s: { r: 2, c: 3 }, e: { r: 2, c: 3 } },
            { s: { r: 2, c: 5 }, e: { r: 2, c: 5 } },
            { s: { r: 3, c: 1 }, e: { r: 3, c: 3 } },
            { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
            { s: { r: 4, c: 0 }, e: { r: 7, c: 5 } },
            { s: { r: 8, c: 1 }, e: { r: 8, c: 1 } },
            { s: { r: 8, c: 3 }, e: { r: 8, c: 5 } },
            { s: { r: 9, c: 1 }, e: { r: 9, c: 1 } },
            { s: { r: 9, c: 3 }, e: { r: 9, c: 5 } },
            { s: { r: 10, c: 0 }, e: { r: 10, c: 5 } }
        ];
        
        // 设置列宽
        ws['!cols'] = [
            { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, '业务事项审批单');
        XLSX.writeFile(wb, `${caseInfo.caseName || '案件'}业务事项审批单.xlsx`);
    },
    
    // 导出伙食补助费领取表
    exportMealSubsidy: function() {
        const data = this.extractedData;
        const travelInfo = data.travelInfo;
        const calc = this.calculatedData;
        
        const travelers = travelInfo.travelers || [];
        const externalPersonnel = travelInfo.externalPersonnel || '';
        const externalList = externalPersonnel ? externalPersonnel.split(/[,，、]/) : [];
        
        // 确定起止日期
        let startDate = travelInfo.startDate || '';
        let endDate = travelInfo.endDate || '';
        
        // 如果有高铁票，使用高铁票日期
        if (data.trainTickets.length > 0) {
            const dates = data.trainTickets.map(t => new Date(t.trainInfo?.departureTime || t.invoiceDate)).filter(d => !isNaN(d));
            if (dates.length > 0) {
                startDate = this.formatDate(new Date(Math.min(...dates)));
                endDate = this.formatDate(new Date(Math.max(...dates)));
            }
        }
        
        const wb = XLSX.utils.book_new();
        const wsData = [
            ['调查案件伙食补助领取表'],
            ['序号', '参与人员', '所属单位', '起止日期', '天数', '补助标准', '补助金额（元）', '领取人签字'],
        ];
        
        let rowIndex = 2;
        
        // 添加出差人员
        travelers.forEach((name, index) => {
            wsData.push([
                index + 1,
                name,
                '睢阳区烟草局',
                `${startDate} - ${endDate}`,
                calc.days,
                100,
                calc.days * 100,
                ''
            ]);
            rowIndex++;
        });
        
        // 添加行业外人员
        externalList.forEach((name, index) => {
            wsData.push([
                travelers.length + index + 1,
                name.trim(),
                data.caseInfo.cooperatingUnit || '',
                `${startDate} - ${endDate}`,
                calc.days,
                100,
                calc.days * 100,
                ''
            ]);
            rowIndex++;
        });
        
        // 添加合计行
        wsData.push(['', '合计', '', '', '', '', calc.mealSubsidyTotal, '']);
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }
        ];
        
        ws['!cols'] = [
            { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 8 }, { wch: 10 }, { wch: 15 }, { wch: 12 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, '伙食补助费领取表');
        XLSX.writeFile(wb, '伙食补助费领取表.xlsx');
    },
    
    // 导出租车费用审批表
    exportCarRental: function() {
        const data = this.extractedData;
        const carInfo = data.carInfo;
        const caseInfo = data.caseInfo;
        const travelInfo = data.travelInfo;
        const calc = this.calculatedData;
        
        // 计算租车天数
        let rentalDays = 0;
        if (carInfo.pickupDate && carInfo.returnDate) {
            const pickup = new Date(carInfo.pickupDate);
            const returnD = new Date(carInfo.returnDate);
            rentalDays = Math.ceil((returnD - pickup) / (1000 * 60 * 60 * 24));
        }
        
        const dailyRate = rentalDays > 0 ? (parseFloat(carInfo.totalCost) || 0) / rentalDays : 0;
        
        const wb = XLSX.utils.book_new();
        const wsData = [
            ['租车费用审批明细表'],
            [`单位：睢阳区局`, '', `租车起止日期：${carInfo.pickupDate || ''}至${carInfo.returnDate || ''}`, '', '', '', `金额：元`],
            ['租车原因说明', '', '', '租车地点', '', '租车公司名称', ''],
            [`赴${caseInfo.caseLocation || travelInfo.destination || ''}调查${caseInfo.caseName || ''}`, '', '', caseInfo.caseLocation || travelInfo.destination || '', '', carInfo.rentalCompany || '', ''],
            ['租车车辆名称', '车牌号码', '排气量', '日租车标准', '租车天数', '租车费用'],
            [carInfo.vehicleInfo || '', carInfo.plateNumber || '', '', dailyRate.toFixed(2), rentalDays, carInfo.totalCost || ''],
            ['日期', '加油数量（升）', '燃油费', '过路费', '其他费用', '备注']
        ];
        
        // 添加每日明细
        const fuelByDate = {};
        data.fuelInvoices.forEach(f => {
            if (f.plateNumber === carInfo.plateNumber) {
                const date = f.invoiceDate;
                if (!fuelByDate[date]) fuelByDate[date] = { volume: 0, amount: 0 };
                fuelByDate[date].volume += parseFloat(f.fuelVolume) || 0;
                fuelByDate[date].amount += parseFloat(f.fuelAmount) || parseFloat(f.totalAmount) || 0;
            }
        });
        
        const tollByDate = {};
        data.tollInvoices.forEach(t => {
            if (t.plateNumber === carInfo.plateNumber) {
                const date = t.invoiceDate;
                if (!tollByDate[date]) tollByDate[date] = 0;
                tollByDate[date] += parseFloat(t.tollAmount) || parseFloat(t.totalAmount) || 0;
            }
        });
        
        // 生成日期范围
        const dates = [];
        if (carInfo.pickupDate && carInfo.returnDate) {
            let current = new Date(carInfo.pickupDate);
            const end = new Date(carInfo.returnDate);
            while (current < end) {
                dates.push(this.formatDate(current));
                current.setDate(current.getDate() + 1);
            }
        }
        
        dates.forEach(date => {
            const fuel = fuelByDate[date] || { volume: '', amount: '' };
            const toll = tollByDate[date] || '';
            wsData.push([date, fuel.volume || '', fuel.amount || '', toll, '', '']);
        });
        
        // 添加合计行
        const totalFuel = Object.values(fuelByDate).reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
        const totalToll = Object.values(tollByDate).reduce((sum, t) => sum + (parseFloat(t) || 0), 0);
        wsData.push(['合计', '', totalFuel.toFixed(2), totalToll.toFixed(2), '', '-', '-']);
        
        wsData.push(['主要负责人：', '', '', '分管领导：', '', '', '经办人员签字：']);
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
            { s: { r: 1, c: 2 }, e: { r: 1, c: 5 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
            { s: { r: 2, c: 3 }, e: { r: 2, c: 4 } },
            { s: { r: 2, c: 5 }, e: { r: 2, c: 6 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
            { s: { r: 3, c: 3 }, e: { r: 3, c: 4 } },
            { s: { r: 3, c: 5 }, e: { r: 3, c: 6 } }
        ];
        
        ws['!cols'] = [
            { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, '租车费用审批表');
        XLSX.writeFile(wb, '租车费用审批表.xlsx');
    },
    
    // 导出梳理表
    exportSummary: function() {
        const data = this.extractedData;
        const calc = this.calculatedData;
        
        const wb = XLSX.utils.book_new();
        
        // 高铁信息
        const trainData = [
            ['高铁'],
            ['日期', '票价', '人数', '合计', '总合计']
        ];
        
        let trainTotalRow = 2;
        data.trainTickets.forEach(t => {
            const price = parseFloat(t.ticketPrice) || parseFloat(t.totalAmount) || 0;
            trainData.push([
                this.formatShortDate(t.trainInfo?.departureTime || t.invoiceDate),
                price,
                1,
                price
            ]);
            trainTotalRow++;
        });
        
        if (data.trainTickets.length > 0) {
            trainData[2].push(calc.trainTotal);
        }
        
        // 住宿费
        const hotelData = [
            ['住宿费'],
            ['日期', '发票金额']
        ];
        
        data.hotelInvoices.forEach(h => {
            hotelData.push([
                this.formatShortDate(h.invoiceDate),
                parseFloat(h.amount) || parseFloat(h.totalAmount) || 0
            ]);
        });
        
        hotelData.push(['合计', data.hotelInvoices.reduce((sum, h) => sum + (parseFloat(h.amount) || parseFloat(h.totalAmount) || 0), 0)]);
        
        // 燃油费
        const fuelData = [
            ['燃油费'],
            ['日期', '发票金额']
        ];
        
        data.fuelInvoices.forEach(f => {
            fuelData.push([
                this.formatShortDate(f.invoiceDate),
                parseFloat(f.fuelAmount) || parseFloat(f.totalAmount) || 0
            ]);
        });

        fuelData.push(['合计', calc.fuelTotal]);

        // 过路费
        const tollData = [
            ['过路费'],
            ['日期', '金额']
        ];

        data.tollInvoices.forEach(t => {
            tollData.push([
                this.formatShortDate(t.invoiceDate),
                parseFloat(t.tollAmount) || parseFloat(t.totalAmount) || 0
            ]);
        });

        tollData.push(['合计', calc.tollTotal]);

        // 租车
        const carData = [
            ['租车'],
            [data.carInfo.totalCost || 0]
        ];

        // 补助
        const subsidyData = [
            ['补助'],
            [`${this.formatShortDate(data.travelInfo.startDate)}至${this.formatShortDate(data.travelInfo.endDate)}`, calc.personCount, 100, calc.mealSubsidyTotal]
        ];

        // 出差费用汇总
        const summaryData = [
            ['出差费用', '高铁', '住宿', '燃油', '过路', '租车', '补助', '合计'],
            ['', calc.trainTotal, data.hotelInvoices.reduce((sum, h) => sum + (parseFloat(h.amount) || parseFloat(h.totalAmount) || 0), 0), calc.fuelTotal, calc.tollTotal, calc.carTotal, calc.mealSubsidyTotal, calc.totalExpense]
        ];

        // 合并所有数据
        const wsData = [
            ...trainData,
            [''],
            ...hotelData,
            [''],
            ...fuelData,
            [''],
            ...tollData,
            [''],
            ...carData,
            [''],
            ...subsidyData,
            [''],
            ...summaryData
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];

        XLSX.utils.book_append_sheet(wb, ws, '梳理');
        XLSX.writeFile(wb, '梳理.xlsx');
    },

    // 导出出差费用说明
    exportExpenseNote: function() {
        const data = this.extractedData;
        const calc = this.calculatedData;
        const caseInfo = data.caseInfo;
        const travelInfo = data.travelInfo;
        const carInfo = data.carInfo;

        // 计算Z日期
        let zDate = '';
        if (data.payments.length > 0) {
            const latestPayment = data.payments.reduce((latest, p) => {
                const date = new Date(p.paymentTime);
                return date > latest ? date : latest;
            }, new Date(0));
            latestPayment.setDate(latestPayment.getDate() + 5);
            zDate = this.formatDate(latestPayment);
        }

        let content = caseInfo.caseDescription || '';

        // 如果有租车费用，添加第二段
        if (calc.carTotal > 0 && carInfo.pickupDate && carInfo.returnDate) {
            content += `\n\n因外出调查案件需要，${carInfo.pickupDate}至${carInfo.returnDate}在${caseInfo.caseLocation || travelInfo.destination || ''}租用${carInfo.vehicleInfo || ''}（${carInfo.plateNumber || ''}）。租赁车辆期间，产生租车费费用总金额${calc.carTotal.toFixed(2)}元。`;
        }

        // 第三段
        content += `\n\n出差期间，办案人员严格按照市局关于转发《河南省烟草专卖局办公室关于印发专卖执法经费开支管理办法(修订)的通知》(商烟〔2023〕80号)和市局《关于印发河南省烟草公司商丘市公司差旅费管理办法的通知》(商烟〔2022〕7号)要求。期间产生高铁费${calc.trainTotal.toFixed(2)}元，车辆租金费${calc.carTotal.toFixed(2)}元，燃油费${calc.fuelTotal.toFixed(2)}元，过路费${calc.tollTotal.toFixed(2)}元，伙食补助费每人每天100元共计${calc.mealSubsidyTotal.toFixed(2)}元，以上共计出差费用${calc.totalExpense.toFixed(2)}元。`;

        // 创建Word文档
        const doc = new docx.Document({
            sections: [{
                properties: {},
                children: [
                    new docx.Paragraph({
                        text: `关于赴${caseInfo.caseLocation || travelInfo.destination || ''}出差费用的说明`,
                        heading: docx.HeadingLevel.HEADING_1,
                        alignment: docx.AlignmentType.CENTER
                    }),
                    new docx.Paragraph({ text: '' }),
                    new docx.Paragraph({
                        children: [new docx.TextRun({ text: content })]
                    }),
                    new docx.Paragraph({ text: '' }),
                    new docx.Paragraph({ text: '' }),
                    new docx.Paragraph({
                        text: '特此说明。',
                        alignment: docx.AlignmentType.RIGHT
                    }),
                    new docx.Paragraph({ text: '' }),
                    new docx.Paragraph({
                        text: '专卖科',
                        alignment: docx.AlignmentType.RIGHT
                    }),
                    new docx.Paragraph({
                        text: zDate,
                        alignment: docx.AlignmentType.RIGHT
                    })
                ]
            }]
        });

        docx.Packer.toBlob(doc).then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `关于赴${caseInfo.caseLocation || travelInfo.destination || ''}出差费用的说明.docx`;
            a.click();
            URL.revokeObjectURL(url);
        });
    },

    // 导出配合调查说明
    exportCooperationNote: function() {
        const data = this.extractedData;
        const caseInfo = data.caseInfo;
        const travelInfo = data.travelInfo;

        const content = `我单位办理睢阳区烟草局移交的${caseInfo.caseNumber || ''}，${caseInfo.seizureInfo || ''}。为继续办理此案，我单位干警${travelInfo.externalPersonnel || ''}，于${travelInfo.startDate || ''}至${travelInfo.endDate || ''}与睢阳区烟草人员赴${caseInfo.caseLocation || travelInfo.destination || ''}进行案件调查。`;

        const doc = new docx.Document({
            sections: [{
                properties: {},
                children: [
                    new docx.Paragraph({
                        text: '关于配合烟草部门调查案件的说明',
                        heading: docx.HeadingLevel.HEADING_1,
                        alignment: docx.AlignmentType.CENTER
                    }),
                    new docx.Paragraph({ text: '' }),
                    new docx.Paragraph({
                        children: [new docx.TextRun({ text: content })]
                    }),
                    new docx.Paragraph({ text: '' }),
                    new docx.Paragraph({
                        text: '特此说明。',
                        alignment: docx.AlignmentType.RIGHT
                    })
                ]
            }]
        });

        docx.Packer.toBlob(doc).then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '关于配合烟草部门调查案件的说明.docx';
            a.click();
            URL.revokeObjectURL(url);
        });
    },

    // 导出全部
    exportAll: function() {
        this.exportBusinessApproval();
        setTimeout(() => this.exportMealSubsidy(), 500);
        setTimeout(() => this.exportCarRental(), 1000);
        setTimeout(() => this.exportSummary(), 1500);
        setTimeout(() => this.exportExpenseNote(), 2000);
        setTimeout(() => this.exportCooperationNote(), 2500);
    },

    // 数字转中文大写
    numberToChinese: function(num) {
        const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
        const units = ['', '拾', '佰', '仟'];
        const bigUnits = ['', '万', '亿', '万亿'];

        if (num === 0) return '零元整';

        let result = '';
        let integerPart = Math.floor(num);
        let decimalPart = Math.round((num - integerPart) * 100);

        // 处理整数部分
        let intStr = '';
        let zeroFlag = false;
        let unitPos = 0;

        while (integerPart > 0) {
            let section = integerPart % 10000;
            if (section === 0) {
                if (!zeroFlag && intStr.length > 0) {
                    intStr = digits[0] + intStr;
                    zeroFlag = true;
                }
            } else {
                zeroFlag = false;
                let sectionStr = '';
                let pos = 0;
                while (section > 0) {
                    let digit = section % 10;
                    if (digit === 0) {
                        if (!zeroFlag && sectionStr.length > 0) {
                            sectionStr = digits[0] + sectionStr;
                            zeroFlag = true;
                        }
                    } else {
                        zeroFlag = false;
                        sectionStr = digits[digit] + units[pos] + sectionStr;
                    }
                    section = Math.floor(section / 10);
                    pos++;
                }
                intStr = sectionStr + bigUnits[unitPos] + intStr;
            }
            integerPart = Math.floor(integerPart / 10000);
            unitPos++;
        }

        result = intStr + '元';

        // 处理小数部分
        if (decimalPart === 0) {
            result += '整';
        } else {
            const jiao = Math.floor(decimalPart / 10);
            const fen = decimalPart % 10;
            if (jiao > 0) result += digits[jiao] + '角';
            if (fen > 0) result += digits[fen] + '分';
        }

        return result;
    },

    // 格式化日期
    formatDate: function(date) {
        if (typeof date === 'string') date = new Date(date);
        if (isNaN(date.getTime())) return date;
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}年${month}月${day}日`;
    },

    // 格式化短日期 (M.DD)
    formatShortDate: function(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return `${date.getMonth() + 1}.${date.getDate()}`;
    }
});

// 全局访问 - Fixed v4
window.TravelExpenseIntelligent = ToolPlatform.getToolConfig('travel-expense-intelligent');