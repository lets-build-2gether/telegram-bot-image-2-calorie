// lib/llm.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { errorHandler } = require("./helpers");

// Initialize the Google AI SDK
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function analyzeImageWithGemini(imageUrl) {
  try {
    // Get the image data
    const imageResponse = await fetch(imageUrl);
    const imageData = await imageResponse.arrayBuffer();

    // Initialize the model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-pro-exp-02-05",
    });

    // Prepare the image data
    const imagePart = {
      inlineData: {
        data: Buffer.from(imageData).toString("base64"),
        mimeType: "image/jpeg",
      },
    };

    // Prepare the prompt
    const prompt = `Analyze this image and provide a detailed description of the food items present. 
    Include the following details for each food item:
    - The name of the food
    - Visible characteristics (color, texture, shape)
    - Any discernible ingredients or preparation methods
    - Estimate the portion size relative to other items in the image
    
    Be as detailed and specific as possible in your description.`;

    // Generate content
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    errorHandler(error, "analyzeImageWithGemini");
    return "Failed to analyze the image";
  }
}

async function classifyAndRefineFoods(initialAnalysis) {
  try {
    if (!initialAnalysis || typeof initialAnalysis !== "string") {
      throw new Error(
        "Invalid input: Initial analysis must be a non-empty string"
      );
    }

    // Initialize the model (using regular Gemini Pro, not Vision)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Prepare the prompt
    const prompt = `As a nutrition expert, analyze the following food description and provide a refined classification.

Input Description:
${initialAnalysis}

Please:
1. Identify and list each distinct food item
2. Provide the precise, standardized name for each food item
3. Specify the standard unit of measurement for each item (e.g., grams, cups, pieces)
4. If there are any ambiguous items, suggest the most likely alternatives
5. Consider any visible preparation methods that might affect classification

Format your response as a clear, detailed list focusing on accuracy and standardization.`;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (!response.text()) {
      throw new Error("Empty response from LLM");
    }

    return response.text();
  } catch (error) {
    errorHandler(error, "classifyAndRefineFoods");
    return "Failed to classify and refine food items";
  }
}

async function estimatePortionsAndNutrition(imageUrl, refinedClassification) {
  try {
    // Get the image data
    const imageResponse = await fetch(imageUrl);
    const imageData = await imageResponse.arrayBuffer();

    // Initialize the model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-pro-exp-02-05",
    });

    // Prepare the image data
    const imagePart = {
      inlineData: {
        data: Buffer.from(imageData).toString("base64"),
        mimeType: "image/jpeg",
      },
    };

    // Prepare the prompt
    const prompt = `As a nutrition expert, analyze this image along with the following food classification:

${refinedClassification}

Please provide:

1. PORTION SIZES:
   - Estimate the absolute portion size for each food item
   - Use visual cues from the image to make accurate estimations
   - Express portions in standard measurements (grams, cups, pieces, etc.)

2. NUTRITIONAL ANALYSIS:
   - Using reliable nutritional databases as reference
   - For each food item, provide:
     * Calories
     * Protein (g)
     * Carbohydrates (g)
     * Fat (g)
     * Fiber (g)
     * Any other significant nutrients

3. TOTAL MEAL ANALYSIS:
   - Sum up the total calories
   - Provide macronutrient breakdown
   - Include any relevant dietary considerations

Please be as specific and detailed as possible in your analysis. Format your response in clear sections for easy reading.`;

    // Generate content
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;

    if (!response.text()) {
      throw new Error("Empty response from LLM");
    }

    return response.text();
  } catch (error) {
    errorHandler(error, "estimatePortionsAndNutrition");
    return "Failed to estimate portions and nutritional content";
  }
}

async function validateAndSummarizeNutrition(
  nutritionalAnalysis,
  userName = ""
) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `Act as a nutrition expert and create a user-friendly summary of this nutritional analysis:

${nutritionalAnalysis}

Create a response in this exact format:
1. First line: Brief 1-sentence description of the meal
2. Detailed breakdown with emojis:
   - Total calories
   - Macronutrients (protein, carbs, fat)
   - Key micronutrients
3. Exercise equivalent (how much walking/running would burn these calories)
4. End with a short funny quote based on the calorie content:
   - If under 500 calories: light-hearted healthy eating quote
   - If 500-800 calories: balanced meal quote
   - If over 800 calories: playful indulgence quote

Use emojis appropriately and format for easy reading in Telegram.
${userName ? `Address the user as ${userName}.` : ""}

Keep the tone friendly and encouraging.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (!response.text()) {
      throw new Error("Empty response from LLM");
    }

    return response.text();
  } catch (error) {
    errorHandler(error, "validateAndSummarizeNutrition");
    return "Failed to generate nutrition summary";
  }
}

module.exports = {
  analyzeImageWithGemini,
  classifyAndRefineFoods,
  estimatePortionsAndNutrition,
  validateAndSummarizeNutrition,
};
