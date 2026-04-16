// 差旅费报销模块示例
// 这是一个GitHub仓库模块的示例，展示了如何创建复杂功能的模块

const expense = {
    name: '差旅费报销助手',
    description: '智能识别PDF发票、XML发票、付款截图、出差人员截图、立案报告表，自动提取关键信息并生成报销表格',
    icon: '💼',
    
    // 模块初始化
    init: function() {
        console.log('Expense module initialized');
        
        // 注册到工具加载器
        // 这里可以将模块作为特殊工具注册到系统中
        // 或者通过其他方式集成到主应用
        
        // 示例：添加一个特殊的工具类型
        this.registerAsTool();
    },
    
    // 注册为工具（供主系统调用）
    registerAsTool: function() {
        // 这里可以实现将模块注册为系统工具的逻辑
        // 例如添加到某个分类下，或者创建一个特殊的入口
        
        // 示例代码：
        // ToolLoader.registerToolLogic('expense_module', {
        //     process: this.process.bind(this),
        //     sheetName: '差旅费报销表',
        //     description: this.description
        // });
    },
    
    // 处理函数（示例）
    process: function(rawData) {
        // 这里实现差旅费报销的处理逻辑
        // 包括OCR识别、信息提取、表格生成等
        
        return {
            data: rawData,
            sheetName: '差旅费报销表',
            fileName: '差旅费报销表',
            formatConfig: {
                titleRow: {
                    height: 60,
                    font: { name: '宋体', size: 22, bold: true },
                    alignment: { horizontal: 'center', vertical: 'middle' },
                    merge: { start: { row: 1, column: 1 }, end: { row: 1, column: 6 } }
                },
                columns: [
                    { width: 32 }, { width: 12 }, { width: 20 }, 
                    { width: 20 }, { width: 20 }, { width: 20 }
                ]
            }
        };
    },
    
    // OCR处理
    processOCR: async function(files) {
        const results = {
            invoices: [],      // 发票信息
            payments: [],      // 付款信息
            travels: [],       // 出差信息
            cases: []          // 立案信息
        };
        
        for (const file of files) {
            const type = this.detectFileType(file);
            
            switch(type) {
                case 'pdf':
                    results.invoices.push(await this.processPDF(file));
                    break;
                case 'xml':
                    results.invoices.push(await this.processXML(file));
                    break;
                case 'image':
                    // 根据内容判断类型
                    const ocrResult = await this.processImage(file);
                    const category = this.categorizeImage(ocrResult);
                    results[category].push(ocrResult);
                    break;
            }
        }
        
        return results;
    },
    
    // 检测文件类型
    detectFileType: function(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'pdf') return 'pdf';
        if (ext === 'xml') return 'xml';
        if (file.type.startsWith('image/')) return 'image';
        return 'unknown';
    },
    
    // 处理PDF
    processPDF: async function(file) {
        // 使用pdfjs-dist解析PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => item.str).join(' ') + '\n';
        }
        
        return this.extractInvoiceInfo(fullText);
    },
    
    // 处理XML
    processXML: async function(file) {
        const text = await file.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        
        // 提取发票信息
        return {
            number: this.getXMLValue(xmlDoc, 'InvoiceNumber'),
            date: this.getXMLValue(xmlDoc, 'InvoiceDate'),
            seller: this.getXMLValue(xmlDoc, 'SellerName'),
            amount: this.getXMLValue(xmlDoc, 'TotalAmount'),
            type: 'xml'
        };
    },
    
    // 处理图片OCR
    processImage: async function(file) {
        if (!this.tesseractWorker) {
            this.tesseractWorker = await Tesseract.createWorker('chi_sim');
        }
        
        const result = await this.tesseractWorker.recognize(file);
        return {
            text: result.data.text,
            confidence: result.data.confidence,
            file: file.name
        };
    },
    
    // 分类图片内容
    categorizeImage: function(ocrResult) {
        const text = ocrResult.text;
        
        // 付款截图特征
        if (text.includes('付款') || text.includes('支付') || text.includes('转账')) {
            return 'payments';
        }
        
        // 出差人员截图特征
        if (text.includes('出差') || text.includes('人员') || text.includes('日期')) {
            return 'travels';
        }
        
        // 立案报告表特征
        if (text.includes('立案') || text.includes('案件') || text.includes('当事人')) {
            return 'cases';
        }
        
        // 默认归类为发票
        return 'invoices';
    },
    
    // 提取发票信息
    extractInvoiceInfo: function(text) {
        return {
            number: this.extractPattern(text, /发票号码[：:]\s*(\d+)/),
            date: this.extractPattern(text, /开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)/),
            seller: this.extractPattern(text, /销售方[：:]\s*([^\n]+)/),
            amount: this.extractPattern(text, /价税合计[（(]大写[)）][：:]\s*([^\n]+)/),
            type: 'pdf'
        };
    },
    
    // 提取XML值
    getXMLValue: function(xmlDoc, tagName) {
        const elements = xmlDoc.getElementsByTagName(tagName);
        return elements.length > 0 ? elements[0].textContent : '';
    },
    
    // 正则提取
    extractPattern: function(text, pattern) {
        const match = text.match(pattern);
        return match ? match[1].trim() : '';
    }
};

// 模块自注册
window.expense = expense;
