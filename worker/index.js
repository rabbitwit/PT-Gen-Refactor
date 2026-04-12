import {handleRequest} from "./src/utils/request.js";
import logger from "./src/logger.js";

export default {
    fetch(request, env) {
        logger.init(env);
        return handleRequest(request, env);
    }
};