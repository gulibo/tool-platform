// 核心引擎 - 提供基础工具函数
const CoreEngine = {
    // 数值清洗函数
    parseAmount: function(val) {
        if (val === undefined || val === null || val === '') return 0.0;
        let s = String(val).trim();
        if (s === '') return 0.0;
        let cleaned = s.replace(/[^\d.-]/g, '');
        let parts = cleaned.split('.');
        if (parts.length > 2) {
            cleaned = parts[0] + '.' + parts.slice(1).join('');
        }
        let num = parseFloat(cleaned);
        return isNaN(num) ? 0.0 : num;
    },

    // 格式化日期
    formatDate: function(date) {
        if (!date) return '';
        const d = new Date(date);
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    },

    // 格式化金额
    formatMoney: function(amount) {
        if (!amount) return '0.00';
        return parseFloat(amount).toFixed(2);
    },

    // 生成唯一ID
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // 深拷贝对象
    deepClone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    // 防抖函数
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 文件大小格式化
    formatFileSize: function(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    // 读取Excel文件
    readExcel: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: true, defval: '' });
                    resolve(json);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    // 导出Excel文件
    exportExcel: async function(data, sheetName, fileName, formatConfig) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);

        if (formatConfig) {
            // 使用自定义格式
            data.forEach((rowData, rIdx) => {
                const row = worksheet.getRow(rIdx + 1);
                row.values = rowData;
                
                let rowFormat;
                if (rIdx === 0 && formatConfig.titleRow) {
                    rowFormat = formatConfig.titleRow;
                    row.height = rowFormat.height;
                } else if (rIdx === 1 && formatConfig.headerRow) {
                    rowFormat = formatConfig.headerRow;
                    row.height = rowFormat.height;
                } else if (formatConfig.dataRow) {
                    rowFormat = formatConfig.dataRow;
                    row.height = rowFormat.height;
                }
                
                row.eachCell((cell, cIdx) => {
                    if (rowFormat) {
                        cell.font = rowFormat.font;
                        cell.alignment = rowFormat.alignment;
                    } else {
                        cell.font = { name: '宋体', size: 12 };
                        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    }
                    
                    // 边框设置
                    if (formatConfig.borders && formatConfig.borders[rIdx]) {
                        cell.border = formatConfig.borders[rIdx];
                    } else {
                        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    }
                });
            });
            
            if (formatConfig.columns) {
                worksheet.columns = formatConfig.columns;
            }
            
            if (formatConfig.titleRow && formatConfig.titleRow.merge) {
                const merge = formatConfig.titleRow.merge;
                worksheet.mergeCells(merge.start.row, merge.start.column, merge.end.row, merge.end.column);
            }
            
            if (formatConfig.secondRow && formatConfig.secondRow.merge) {
                const merge = formatConfig.secondRow.merge;
                worksheet.mergeCells(merge.start.row, merge.start.column, merge.end.row, merge.end.column);
            }
        } else {
            // 通用格式
            data.forEach((rowData, rIdx) => {
                const row = worksheet.getRow(rIdx + 1);
                row.values = rowData;
                row.height = 25;
                row.eachCell((cell) => {
                    cell.font = { name: '宋体', size: 12 };
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                });
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName + '.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
};
