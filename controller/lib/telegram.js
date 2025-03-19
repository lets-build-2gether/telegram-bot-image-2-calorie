const { getAxiosInstance } = require("./axios");
const { errorHandler } = require("./helpers");
const {
  analyzeImageWithGemini,
  classifyAndRefineFoods,
  estimatePortionsAndNutrition,
  validateAndSummarizeNutrition,
} = require("./llm");

const MY_TOKEN = process.env.TELE_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${MY_TOKEN}`;
const axiosInstance = getAxiosInstance(BASE_URL);

function sendMessage(chatId, messageText) {
  return axiosInstance
    .get("sendMessage", {
      chat_id: chatId,
      text: messageText,
    })
    .catch((ex) => {
      errorHandler(ex, "sendMessage", "axios");
    });
}

function getFile(fileId) {
  return axiosInstance
    .get("getFile", {
      file_id: fileId,
    })
    .catch((ex) => {
      errorHandler(ex, "getFile", "axios");
    });
}

async function processThePhoto(messageObj) {
  if (messageObj.photo && messageObj.photo.length !== 0) {
    try {
      // Send initial message to user
      await sendMessage(messageObj.chat.id, "Analyzing your food image...");

      // Taking the file id from the photo
      const fileId = messageObj.photo[messageObj.photo.length - 1].file_id;

      // Getting the file data using that file id
      const fileData = await getFile(fileId);

      if (fileData.data && fileData.data.result) {
        const fileName = fileData.data.result.file_path;
        const file_public_path = `https://api.telegram.org/file/bot${MY_TOKEN}/${fileName}`;

        // Step 1: Initial image analysis
        await sendMessage(messageObj.chat.id, "Step 1: Analyzing the image...");
        const initialAnalysis = await analyzeImageWithGemini(file_public_path);

        await sendMessage(
          messageObj.chat.id,
          "Initial Analysis:\n\n" + initialAnalysis
        );

        // Step 2: Classify and refine foods
        await sendMessage(
          messageObj.chat.id,
          "Step 2: Classifying food items..."
        );
        const refinedClassification = await classifyAndRefineFoods(
          initialAnalysis
        );

        await sendMessage(
          messageObj.chat.id,
          "Refined Classification:\n\n" + refinedClassification
        );

        // Step 3: Estimate portions and nutritional content
        await sendMessage(
          messageObj.chat.id,
          "Step 3: Calculating portions and nutritional content..."
        );
        const nutritionalAnalysis = await estimatePortionsAndNutrition(
          file_public_path,
          refinedClassification
        );

        await sendMessage(
          messageObj.chat.id,
          "Nutritional Analysis:\n\n" + nutritionalAnalysis
        );

        const finalSummary = await validateAndSummarizeNutrition(
          nutritionalAnalysis,
          messageObj.from?.first_name
        );

        await sendMessage(messageObj.chat.id, finalSummary);

        return true;
      }
    } catch (error) {
      errorHandler(error, "processThePhoto");
      await sendMessage(
        messageObj.chat.id,
        "Sorry, there was an error processing your image."
      );
      return false;
    }
  }
  return false;
}

function isBotEnabledForThisChat(chatId) {
  //return ["chatId1","chatId2"].indexOf(chatId) !== -1;
  return true;
}

async function handleMessage(messageObj) {
  const messageText = messageObj.text || "";
  if (!messageText && !messageObj.photo) {
    errorHandler("No meesage text", "handleMessage");
    return "";
  }

  try {
    const chatId = messageObj.chat.id;

    if (!isBotEnabledForThisChat(chatId)) {
      return sendMessage(chatId, "Sorry this bot is not enabled for all users");
    }

    if (messageText.charAt(0) === "/") {
      const command = messageText.substr(1);
      switch (command) {
        case "start":
          // We want to send a welcome message to the user.
          return sendMessage(chatId, "Hi! I'm a bot. How can i help you!");

        default:
          return sendMessage(chatId, "Hey hi, i don't know that command");
      }
    } else if (messageObj.photo) {
      await processThePhoto(messageObj);
      return;
    } else if (messageText) {
      return sendMessage(chatId, messageText);
    } else {
      return sendMessage(chatId, "Received your message!");
    }
  } catch (error) {
    errorHandler(error, "handleMessage");
  }
}

module.exports = { sendMessage, handleMessage };
