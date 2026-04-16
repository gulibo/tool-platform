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
    for (const file of files) {
      const result = await processFileWithGLM(file, apiKey, extractType);
      results.push(result);
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

    if (!response.ok) throw new Error(`GLM API error: ${response.status}`);

    const data = await response.json();
    const content = data.choices[0].message.content;

    return {
      fileName,
      mimeType,
      extractType,
      extractedData: parseExtractedData(content)
    };

  } catch (error) {
    return { fileName, mimeType, extractType, error: error.message, extractedData: null };
  }
}

function buildExtractionPrompt(extractType, fileName) {
  const prompts = {
    invoice: `请识别这张发票，提取：发票号码、开票日期、销售方名称、价税合计金额小写、备注。如果是火车票，提取车次、出发站、到达站、发车时间、票价。返回JSON格式。`,
    payment: `请识别这张支付记录，提取：支付时间、支付金额、收款方。返回JSON格式。`,
    caseApproval: `请识别这张外出办案审批表，提取：案件名称、办案地点、联合办案单位、案件情况。返回JSON格式。`,
    travelApproval: `请识别这张出差审批单，提取：出差人、行业外人员、出差起始日期、出差截止日期、到达地。返回JSON格式。`,
    caseReport: `请识别这张立案报告表，提取：案件编号。返回JSON格式。`,
    carRental: `请识别这张租车结算单，提取：车牌号码、取车时间、还车时间、车辆信息、费用总金额。返回JSON格式。`,
    auto: `请识别这张图片，判断类型（发票/支付记录/审批表等），提取关键信息。返回JSON格式。`
  };
  return prompts[extractType] || prompts.auto;
}

function parseExtractedData(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { rawText: content };
  } catch (e) {
    return { rawText: content, parseError: e.message };
  }
}
