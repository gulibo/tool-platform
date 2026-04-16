// Netlify Function - OCR代理
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { files, extractType } = JSON.parse(event.body);

    if (!files || !Array.isArray(files) || files.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No files provided' }) };
    }

    const apiKey = process.env.GLM_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Processing file ${i + 1}/${files.length}: ${file.fileName}`);
      
      const result = await processFileWithGLM(file, apiKey, extractType);
      results.push(result);
      
      // 添加更长延迟避免429错误（3秒）
      if (i < files.length - 1) {
        console.log('Waiting 3s to avoid rate limit...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: results }) };

  } catch (error) {
    console.error('OCR Proxy Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};

async function processFileWithGLM(file, apiKey, extractType) {
  const { base64Data, mimeType, fileName } = file;
  const prompt = buildExtractionPrompt(extractType, fileName);

  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4.6v-flash',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
          ]
        }],
        temperature: 0.1,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GLM API Error:', response.status, errorText);
      throw new Error(`GLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return {
      fileName,
      mimeType,
      extractType,
      extractedData: parseExtractedData(content),
      rawResponse: content
    };

  } catch (error) {
    console.error('Process File Error:', error);
    return { fileName, mimeType, extractType, error: error.message, extractedData: null };
  }
}

function buildExtractionPrompt(extractType, fileName) {
  // 基础说明
  const baseInstruction = `你是一个专业的财务票据和文档信息提取助手。请仔细识别图片中的文字和信息，提取关键字段。

重要规则：
1. 必须返回有效的JSON格式数据
2. 所有字段都要包含，没有的值用空字符串""
3. 金额只返回数字，不要带单位（如：100.00）
4. 日期统一格式：YYYY-MM-DD（如：2026-03-15）
5. 时间统一格式：HH:mm:ss 或 HH:mm
6. 不要添加任何解释文字，只返回JSON

信息提取逻辑：`;

  // 发票提取逻辑
  const invoiceLogic = `
【发票信息提取】
1. 识别发票类型：增值税普通发票/增值税专用发票/电子发票/火车票/出租车票/飞机票/过路费发票/加油票/其他
2. 提取以下字段：
   - 发票号码：发票右上角或左上角的编号
   - 开票日期：格式YYYY-MM-DD
   - 销售方名称：开票单位/卖方名称
   - 购买方名称：购方名称（如有）
   - 价税合计金额小写：数字，不含单位
   - 价税合计金额大写：中文大写金额
   - 税率：如13%、9%、6%等
   - 税额：税金金额
   - 备注：发票备注栏内容
3. 如果是火车票：
   - 标记是否为火车票：true
   - 提取车次：如G1234
   - 出发站：起始车站
   - 到达站：目的车站
   - 发车时间：YYYY-MM-DD HH:mm
   - 票价：数字
4. 如果是加油票：销售方名称包含"石油"、"石化"、"加油"等
5. 如果是高速通行费：销售方名称包含"高速"、"路桥"、"通行"等

返回JSON格式：
{
  "发票类型": "",
  "发票号码": "",
  "开票日期": "",
  "销售方名称": "",
  "购买方名称": "",
  "价税合计金额小写": "",
  "价税合计金额大写": "",
  "税率": "",
  "税额": "",
  "备注": "",
  "是否为火车票": false,
  "车次": "",
  "出发站": "",
  "到达站": "",
  "发车时间": "",
  "票价": ""
}`;

  // 支付记录提取逻辑
  const paymentLogic = `
【支付记录信息提取】
1. 识别支付类型：微信支付/支付宝/银行转账/其他
2. 提取以下字段：
   - 支付时间：精确到秒，格式YYYY-MM-DD HH:mm:ss
   - 支付金额：数字，不含单位
   - 收款方：收款人名称/商户名称
   - 付款方：付款人名称（如有）
   - 支付方式：微信/支付宝/银行卡/其他
   - 交易单号：订单号/流水号
   - 商品描述：购买的商品或服务描述
   - 支付状态：成功/待支付/已退款等

返回JSON格式：
{
  "支付时间": "",
  "支付金额": "",
  "收款方": "",
  "付款方": "",
  "支付方式": "",
  "交易单号": "",
  "商品描述": "",
  "支付状态": ""
}`;

  // 外出办案审批表提取逻辑
  const caseApprovalLogic = `
【外出办案审批表信息提取】
1. 提取案件基本信息：
   - 案件名称：表格标题或第一行大字
   - 案件编号：案号（如有）
   - 办案地点：外出办案的地点
   - 联合办案单位：协作单位名称（如有）
   - 案件情况：简要案情描述
2. 提取出差信息：
   - 出差人：办案人员姓名
   - 行业外人员：外部协作人员（如有）
   - 出差起始日期：格式YYYY-MM-DD
   - 出差截止日期：格式YYYY-MM-DD
   - 出差天数：数字
   - 到达地：目的地
3. 提取审批信息：
   - 审批人：批准人姓名
   - 审批日期：格式YYYY-MM-DD

返回JSON格式：
{
  "案件名称": "",
  "案件编号": "",
  "办案地点": "",
  "联合办案单位": "",
  "案件情况": "",
  "出差人": "",
  "行业外人员": "",
  "出差起始日期": "",
  "出差截止日期": "",
  "出差天数": "",
  "到达地": "",
  "审批人": "",
  "审批日期": ""
}`;

  // 出差审批单提取逻辑
  const travelApprovalLogic = `
【出差审批单信息提取】
1. 提取出差人员信息：
   - 出差人：出差人员姓名，多人用逗号分隔
   - 行业外人员：外部人员（如有）
2. 提取出差时间地点：
   - 出差起始日期：格式YYYY-MM-DD
   - 出差截止日期：格式YYYY-MM-DD
   - 出差天数：数字
   - 到达地：出差目的地
   - 交通工具：飞机/火车/汽车等
3. 提取出差事由：
   - 出差事由：出差目的说明
4. 提取审批信息：
   - 审批人：批准人姓名
   - 审批日期：格式YYYY-MM-DD

返回JSON格式：
{
  "出差人": "",
  "行业外人员": "",
  "出差起始日期": "",
  "出差截止日期": "",
  "出差天数": "",
  "到达地": "",
  "交通工具": "",
  "出差事由": "",
  "审批人": "",
  "审批日期": ""
}`;

  // 立案报告表提取逻辑
  const caseReportLogic = `
【立案报告表信息提取】
1. 提取案件基本信息：
   - 案件编号：案号/立案号
   - 案件名称：案件标题
   - 立案时间：格式YYYY-MM-DD
   - 立案人：立案人员姓名
   - 案件类型：刑事案件/民事案件/行政案件等
   - 案件摘要：案情简要描述

返回JSON格式：
{
  "案件编号": "",
  "案件名称": "",
  "立案时间": "",
  "立案人": "",
  "案件类型": "",
  "案件摘要": ""
}`;

  // 租车结算单提取逻辑
  const carRentalLogic = `
【租车结算单信息提取】
1. 提取车辆信息：
   - 车牌号码：如京A12345
   - 车辆品牌：如大众、丰田等
   - 车辆型号：如帕萨特、凯美瑞等
2. 提取租车时间：
   - 取车时间：格式YYYY-MM-DD HH:mm
   - 还车时间：格式YYYY-MM-DD HH:mm
   - 租车天数：数字
3. 提取费用信息：
   - 费用总金额：数字，不含单位
   - 租车费：基础租金
   - 保险费：保险费用（如有）
   - 油费：油费（如有）
   - 其他费用：其他杂费（如有）

返回JSON格式：
{
  "车牌号码": "",
  "车辆品牌": "",
  "车辆型号": "",
  "取车时间": "",
  "还车时间": "",
  "租车天数": "",
  "费用总金额": "",
  "租车费": "",
  "保险费": "",
  "油费": "",
  "其他费用": ""
}`;

  // 自动识别逻辑
  const autoLogic = `
【自动识别模式】
1. 首先判断文档类型：
   - 看是否有"发票"、"火车票"、"出租车票"等字样 → 发票
   - 看是否有"支付"、"微信"、"支付宝"、"交易"等字样 → 支付记录
   - 看是否有"办案审批"、"外出办案"等字样 → 外出办案审批表
   - 看是否有"出差审批"、"出差申请"等字样 → 出差审批单
   - 看是否有"立案"、"报案"等字样 → 立案报告表
   - 看是否有"租车"、"结算单"、"车牌"等字样 → 租车结算单
2. 根据识别出的类型，提取相应的字段信息
3. 返回JSON格式：
{
  "文档类型": "发票/支付记录/外出办案审批表/出差审批单/立案报告表/租车结算单/其他",
  "提取的数据": {
    // 根据文档类型填充相应字段
  }
}`;

  const prompts = {
    invoice: baseInstruction + invoiceLogic,
    payment: baseInstruction + paymentLogic,
    caseApproval: baseInstruction + caseApprovalLogic,
    travelApproval: baseInstruction + travelApprovalLogic,
    caseReport: baseInstruction + caseReportLogic,
    carRental: baseInstruction + carRentalLogic,
    auto: baseInstruction + autoLogic
  };

  return prompts[extractType] || prompts.auto;
}

function parseExtractedData(content) {
  try {
    // 尝试直接解析整个内容
    try {
      const directParse = JSON.parse(content);
      if (directParse && typeof directParse === 'object') {
        return directParse;
      }
    } catch (e) {
      // 继续尝试其他方法
    }

    // 尝试从代码块中提取JSON
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1].trim());
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {
        // 继续尝试其他方法
      }
    }

    // 尝试匹配JSON对象
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {
        // 继续尝试其他方法
      }
    }

    // 如果都失败了，返回原始文本
    console.warn('Could not parse JSON from content:', content.substring(0, 200));
    return { rawText: content, parseError: 'JSON parse failed' };

  } catch (e) {
    console.error('Parse error:', e);
    return { rawText: content, parseError: e.message };
  }
}
