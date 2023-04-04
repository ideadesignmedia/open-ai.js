# open-ai.js
Easily interact with the OpenAI API through our SDK.

## Installation
```yarn add @ideadesignmedia/open-ai.js```
You must include new environment variables in node before requiring this package:
```
process.env.OPEN_AI_ORGANIZATION = <your-organization>
process.env.OPEN_AI_SECRET = <your-secret-key>
```
You can also pass these as arguments when starting your node process:
```node <filename> <...other_arguments> OPEN_AI_ORGANIZATION=<your-organization> OPEN_AI_SECRET=<your-secret-key>```

## Usage
```
/* process.env.OPEN_AI_ORGANIZATION and process.env.OPEN_AI_SECRET should already be initialized */
const {
    Message,
    getModel,
    getModels,
    edit,
    completion,
    completionStream,
    chatCompletion,
    chatCompletionStream,
    getFineTunedModels,
    getFineTunedModel,
    createFineTunedModel,
    cancelFineTune,
    deleteFineTune,
    getFineTuneEvents,
    generateImage,
    editImage,
    getImageVariations,
    getEmbedding,
    getTranscription,
    getTranslation,
    getFiles,
    getFile,
    getFileContent,
    uploadFile,
    deleteFile,
    moderation
} = require('@ideadesignmedia/open-ai.js');
```
### Message
```Message(content, role) => {content, role}```
This function is used to format a chat completion message. Possible roles for completion are system, user, assistant.

##### Parameters:
```content: string```: The content of the message.
```role: string```: The role of the message.

##### Sample usage:
```
const message = Message('Test message, send me back 10 resposes.', 'user'); // { content: 'Test message, send me back 10 resposes.', role: 'user' }
```

### getModels
```getModels() => Promise<response>```

##### Sample Response:
```
{
  "data": [
    {
      "id": "model-id-0",
      "object": "model",
      "owned_by": "organization-owner",
      "permission": [...]
    },
    {
      "id": "model-id-1",
      "object": "model",
      "owned_by": "organization-owner",
      "permission": [...]
    },
    {
      "id": "model-id-2",
      "object": "model",
      "owned_by": "openai",
      "permission": [...]
    },
  ],
  "object": "list"
}
```

### getModel
```getModel(modelId) => Promise<response>```

##### Parameters:
```modelId: string```: The id of the model to retrieve.

##### Sample Response:
```
{
  "id": "text-davinci-003",
  "object": "model",
  "owned_by": "openai",
  "permission": [...]
}
```

### completion
```completion(messages = [], resultCount = 1, stop, options = { model: 'text-ada-001' }) => Promise<response>```

##### Parameters:
```messages: string[]```: An array of strings to use for the completion.
```resultCount: number```: The number of responses to return.
```stop: string[]```: An array of strings to use as stop tokens.
```options: object```: The options to use for the completion. Possible options are:
```
{
  model: 'text-ada-001', // possible models are: text-davinci-003, text-davinci-002, text-curie-001, text-babbage-001, text-ada-001, davinci, curie, babbage, ada
  temperature: 0.5,
  max_tokens: 32,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  stop: ['\n']
}
```

##### Sample Response:
```
{
  "id": "cmpl-uqkvlQyYK7bGYrRHQ0eXlWi7",
  "object": "text_completion",
  "created": 1589478378,
  "model": "text-davinci-003",
  "choices": [
    {
      "text": "\n\nThis is indeed a test",
      "index": 0,
      "logprobs": null,
      "finish_reason": "length"
    }
  ],
  "usage": {
    "prompt_tokens": 5,
    "completion_tokens": 7,
    "total_tokens": 12
  }
}
```
### completionStream
```completionStream(messages = [], resultCount = 1, stop, options = { model: 'text-ada-001' }) => Promise<ResponseStream>```
###### Note: Responses may be too fast to listen for the stream events through a response stream. Use the completion method instead.

##### Parameters:
```messages: string[]```: An array of strings to use for the completion.
```resultCount: number```: The number of responses to return.
```stop: string[]```: An array of strings to use as stop tokens.
```options: object```: The options to use for the completion. Possible options are:
```
{
  model: 'text-ada-001', // possible models are: text-davinci-003, text-davinci-002, text-curie-001, text-babbage-001, text-ada-001, davinci, curie, babbage, ada
  temperature: 0.5,
  max_tokens: 32,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  stop: ['\n']
}
```

#### ResponseStream
A ResponseStream EventEmitter that manages the response events from the OpenAI API. Manage the stream with the following methods:
```
onComplete: () => void
onData = (data: string[]) => void
```

##### Sample Usage:
```
completionStream('Test message, send me back 10 resposes.').then(stream => new Promise((res) => {
    let d = ''
    stream.onComplete = () => {
        console.log('Stream Complete: ', data);
        res(d)
    }
    stream.onData = (data) => {
        console.log('Stream Data: ', data);
        d += data;
    }
})).catch(console.error)
```

### chatCompletion
```chatCompletion(messages = [], resultCount = 1, stop, options = { model: 'gpt-3.5-turbo' }) => Promise<response>```

##### Parameters:
```messages: Message[]```: An array of Message objects to use for the chat completion.
```resultCount: number```: The number of responses to return.
```stop: string[]```: An array of strings to use as stop tokens.
```options: object```: The options to use for the chat completion. Possible options are:
```
{
  model: 'gpt-3.5-turbo',
  temperature: 0.5,
  max_tokens: 32,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  stop: ['\n']
}
```

##### Sample Response:
```
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "\n\nHello there, how may I assist you today?",
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 12,
    "total_tokens": 21
  }
}
```

### chatCompletionStream
```chatCompletionStream(messages = [], resultCount = 1, stop, options = { model: 'gpt-3.5-turbo' }) => Promise<ResponseStream>```

##### Parameters:
```messages: Message[]```: An array of Message objects to use for the chat completion.
```resultCount: number```: The number of responses to return.
```stop: string[]```: An array of strings to use as stop tokens.
```options: object```: The options to use for the chat completion. Possible options are:
```
{
  model: 'gpt-3.5-turbo',
  temperature: 0.5,
  max_tokens: 32,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  stop: ['\n']
}
```

##### Sample Response:
see [completionStream](#completionStream)

### edit
```edit(instruction, input, numberOfEdits, options = {model: 'text-davinci-edit-001'}) => Promise<response>```

##### Parameters:
```instruction: string```: The instruction to use for the edit.
```input: string```: The input to use for the edit.
```numberOfEdits: number```: The number of edits to return.
```options: object```: The options to use for the edit. Possible options are:
```
{
  model: 'text-davinci-edit-001',
  temperature: 0.5,
  max_tokens: 32,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  stop: ['\n']
}
```

##### Sample Response:
```
{
  "object": "edit",
  "created": 1589478378,
  "choices": [
    {
      "text": "What day of the week is it?",
      "index": 0,
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 32,
    "total_tokens": 57
  }
}
```

### generateImage
```generateImage(prompt, resultCount,  size = 0, responseFormat = 'url', user) => Promise<response>```

##### Parameters:
```prompt: string```: The prompt to use for the image.
```resultCount: number```: The number of images to return. Maximum result count is ```10```.
```size: number```: The size of the image to return. Possible Image Sizes: 
```
{
  0: '256x256',
  1: '512x512', 
  2: '1024x1024
}
```
```responseFormat: string```: Possible response formats are ```url``` or ```b64_json``` or use ```file``` to return the image as a buffer as well as the url.
```user: string```: The user to use for the request. If not provided, the default user will be used.

##### Sample Response:
```
{
  "created": 1589478378,
  "data": [
    {
      "url": "https://..."
    },
    {
      "url": "https://..."
    }
  ]
}
```

### editImage
```editImage(imagePath, prompt, maskPath, resultCount, size, responseFormat, user) => Promise<response>```

##### Parameters:
```imagePath: string```: Use a url or relative/absolute path to an image.
```prompt: string```: The prompt to use for the image.
```maskPath: string```: Use a url or relative/absolute path to an image.
```resultCount: number```: The number of variations to return. Maximum result count is ```10```.
```size: number```: The size of the image to return. See [generateImage](#generateImage) for possible image sizes.
```responseFormat: string```: May use response types ```url``` or ```b64_json``` or use ```file``` to return the image as a buffer as well as the url.
```user: string```: Optional user id to associate with the request.

##### Sample Response:
```
{
  "created": 1589478378,
  "data": [
    {
      "url": "https://..."
    },
    {
      "url": "https://..."
    }
  ]
}
```

### getImageVariations
```getImageVariations(imagePath, resultCount, size, responseFormat, user) => Promise<response>```

##### Parameters:
```imagePath: string```: Use a url or relative/absolute path to an image.
```resultCount: number```: The number of variations to return. Maximum result count is ```10```.
```size: number```: The size of the image to return. See [generateImage](#generateImage) for possible image sizes.
```responseFormat: string```: May use response types ```url``` or ```b64_json``` or use ```file``` to return the image as a buffer as well as the url.
```user: string```: Optional user id to associate with the request.

##### Sample Response:
```
{
  "created": 1589478378,
  "data": [
    {
      "url": "https://..."
    },
    {
      "url": "https://..."
    }
  ]
}
```

### getEmbedding
```getEmbedding(input, model = 'text-embedding-ada-002', user) => Promise<response>```

##### Parameters:
```input: string```: input to get embedding for
```model: string```: model to use for embedding
```user: string```: Optional user id to associate with the request.

##### Sample Response:
```
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [
        0.0023064255,
        -0.009327292,
        .... (1536 floats total for ada-002)
        -0.0028842222,
      ],
      "index": 0
    }
  ],
  "model": "text-embedding-ada-002",
  "usage": {
    "prompt_tokens": 8,
    "total_tokens": 8
  }
}
```

### getTranscription
```getTranscription(file, prompt, language = 'en', responseFormat = 'json', temperature = 0) => Promise<response>```

##### Parameters:
```file: string```: Use a url or relative/absolute path to an audio file.
```prompt: string```: The prompt to use for the transcription.
```language: string```: The language to use for the transcription. default is ```en```.
```responseFormat: string```: May use response types ```json``` or ```text```.
```temperature: number```: The temperature to use for the transcription. Possible temperatures are ```0``` or ```1```.

##### Sample Response:
```
{
  "text": "Imagine the wildest idea that you've ever had, and you're curious about how it might scale to something that's a 100, a 1,000 times bigger. This is a place where you can get to do that."
}
```

### getTranslation
```getTranslation(file, prompt, responseFormat, temperature) => Promise<response>```

##### Parameters:
```file: string```: Use a url or relative/absolute path to an audio file.
```prompt: string```: The prompt to use for the translation.
```responseFormat: string```: May use response types ```json``` or ```text```.
```temperature: number```: The temperature to use for the translation. Possible temperatures are ```0``` or ```1```.

##### Sample Response:
```
{
  "text": "Hello, my name is Wolfgang and I come from Germany. Where are you heading today?"
}
```

### getFiles
```getFiles() => Promise<response>```

##### Sample Response:
```
{
  "data": [
    {
      "id": "file-ccdDZrC3iZVNiQVeEA6Z66wf",
      "object": "file",
      "bytes": 175,
      "created_at": 1613677385,
      "filename": "train.jsonl",
      "purpose": "search"
    },
    {
      "id": "file-XjGxS3KTG0uNmNOK362iJua3",
      "object": "file",
      "bytes": 140,
      "created_at": 1613779121,
      "filename": "puppy.jsonl",
      "purpose": "search"
    }
  ],
  "object": "list"
}
```

### getFile
```getFile(fileId) => Promise<response>```

##### Parameters:
```fileId: string```: The id of the file to retrieve.

##### Sample Response:
```
{
  "id": "file-XjGxS3KTG0uNmNOK362iJua3",
  "object": "file",
  "bytes": 140,
  "created_at": 1613779657,
  "filename": "mydata.jsonl",
  "purpose": "fine-tune"
}
```

### getFileContent
```getFileContent(fileId) => Promise<string>```

##### Parameters:
```fileId: string```: The id of the file to retrieve.

##### Sample Response:
File content as utf-8 string.

### uploadFile
```uploadFile(file, fileName, fileType, filePurpose) => Promise<response>```

##### Parameters:
```file: string```: Use a url or relative/absolute path to a file.
```fileName: string```: The name of the file to upload.
```fileType: string```: The type of the file to upload. Possible types are ```search``` or ```fine-tune```.
```filePurpose: string```: The purpose of the file to upload. Possible purposes are ```search``` or ```fine-tune```.

##### Sample Response:
```
{
  "id": "file-XjGxS3KTG0uNmNOK362iJua3",
  "object": "file",
  "bytes": 140,
  "created_at": 1613779121,
  "filename": "mydata.jsonl",
  "purpose": "fine-tune"
}
```

### deleteFile
```deleteFile(fileId) => Promise<response>```

##### Parameters:
```fileId: string```: The id of the file to delete.

##### Sample Response:
```
{
  "id": "file-XjGxS3KTG0uNmNOK362iJua3",
  "object": "file",
  "deleted": true
}
```

### getFineTunedModels
```getFineTunedModels() => Promise<response>```

##### Sample Response:
```
{
  "object": "list",
  "data": [
    {
      "id": "ft-AF1WoRqd3aJAHsqc9NY7iL8F",
      "object": "fine-tune",
      "model": "curie",
      "created_at": 1614807352,
      "fine_tuned_model": null,
      "hyperparams": { ... },
      "organization_id": "org-...",
      "result_files": [],
      "status": "pending",
      "validation_files": [],
      "training_files": [ { ... } ],
      "updated_at": 1614807352,
    },
    { ... },
    { ... }
  ]
}
```

### getFineTunedModel
```getFineTunedModel(modelId) => Promise<response>```

##### Parameters:
```modelId: string```: The id of the fine-tuned model to retrieve.

##### Sample Response:
```
{
  "id": "ft-AF1WoRqd3aJAHsqc9NY7iL8F",
  "object": "fine-tune",
  "model": "curie",
  "created_at": 1614807352,
  "events": [
    {
      "object": "fine-tune-event",
      "created_at": 1614807352,
      "level": "info",
      "message": "Job enqueued. Waiting for jobs ahead to complete. Queue number: 0."
    },
    {
      "object": "fine-tune-event",
      "created_at": 1614807356,
      "level": "info",
      "message": "Job started."
    },
    {
      "object": "fine-tune-event",
      "created_at": 1614807861,
      "level": "info",
      "message": "Uploaded snapshot: curie:ft-acmeco-2021-03-03-21-44-20."
    },
    {
      "object": "fine-tune-event",
      "created_at": 1614807864,
      "level": "info",
      "message": "Uploaded result files: file-QQm6ZpqdNwAaVC3aSz5sWwLT."
    },
    {
      "object": "fine-tune-event",
      "created_at": 1614807864,
      "level": "info",
      "message": "Job succeeded."
    }
  ],
  "fine_tuned_model": "curie:ft-acmeco-2021-03-03-21-44-20",
  "hyperparams": {
    "batch_size": 4,
    "learning_rate_multiplier": 0.1,
    "n_epochs": 4,
    "prompt_loss_weight": 0.1,
  },
  "organization_id": "org-...",
  "result_files": [
    {
      "id": "file-QQm6ZpqdNwAaVC3aSz5sWwLT",
      "object": "file",
      "bytes": 81509,
      "created_at": 1614807863,
      "filename": "compiled_results.csv",
      "purpose": "fine-tune-results"
    }
  ],
  "status": "succeeded",
  "validation_files": [],
  "training_files": [
    {
      "id": "file-XGinujblHPwGLSztz8cPS8XY",
      "object": "file",
      "bytes": 1547276,
      "created_at": 1610062281,
      "filename": "my-data-train.jsonl",
      "purpose": "fine-tune-train"
    }
  ],
  "updated_at": 1614807865,
}
```

### createFineTunedModel
```createFineTunedModel(trainingFile, validationFile, model, epochs, batchSize, learningRate, promptLoss, computeClassificationMetrics, classificationClasses, classificationBetas, suffix) => Promise<response>```

##### Parameters:
```trainingFile: string```: File to use for training.
```validationFile: string```: File to use for validation
```model: string```: Name of model to train
```epochs```: Number of epochs to train for
```batchSize```: Batch size to use for training
```learningRate```: Learning rate to use for training
```promptLoss```: Prompt loss weight to use for training
```computeClassificationMetrics```: Whether to compute classification metrics
```classificationClasses```: List of classes to use for classification
```classificationBetas```: List of betas to use for classification
```suffix```: Suffix to append to fine-tuned model name

##### Sample Response:
```
{
  "id": "ft-AF1WoRqd3aJAHsqc9NY7iL8F",
  "object": "fine-tune",
  "model": "curie",
  "created_at": 1614807352,
  "events": [
    {
      "object": "fine-tune-event",
      "created_at": 1614807352,
      "level": "info",
      "message": "Job enqueued. Waiting for jobs ahead to complete. Queue number: 0."
    }
  ],
  "fine_tuned_model": null,
  "hyperparams": {
    "batch_size": 4,
    "learning_rate_multiplier": 0.1,
    "n_epochs": 4,
    "prompt_loss_weight": 0.1,
  },
  "organization_id": "org-...",
  "result_files": [],
  "status": "pending",
  "validation_files": [],
  "training_files": [
    {
      "id": "file-XGinujblHPwGLSztz8cPS8XY",
      "object": "file",
      "bytes": 1547276,
      "created_at": 1610062281,
      "filename": "my-data-train.jsonl",
      "purpose": "fine-tune-train"
    }
  ],
  "updated_at": 1614807352,
}
```

### deleteFineTune
```deleteFineTunedModel(modelId) => Promise<response>```

##### Parameters:
```modelId: string```: ID of fine-tuned model to delete

##### Sample Response:
```
{
  "id": "curie:ft-acmeco-2021-03-03-21-44-20",
  "object": "model",
  "deleted": true
}
```

### getFineTuneEvents
```getFineTuneEvents(modelId) => Promise<response>```

##### Parameters:
```modelId: string```: ID of fine-tuned model to get events for

##### Sample Response:
```
{
  "object": "list",
  "data": [
    {
      "object": "fine-tune-event",
      "created_at": 1614807352,
      "level": "info",
      "message": "Job enqueued. Waiting for jobs ahead to complete. Queue number: 0."
    },
    {
      "object": "fine-tune-event",
      "created_at": 1614807356,
      "level": "info",
      "message": "Job started."
    },
    {
      "object": "fine-tune-event",
      "created_at": 1614807861,
      "level": "info",
      "message": "Uploaded snapshot: curie:ft-acmeco-2021-03-03-21-44-20."
    },
    {
      "object": "fine-tune-event",
      "created_at": 1614807864,
      "level": "info",
      "message": "Uploaded result files: file-QQm6ZpqdNwAaVC3aSz5sWwLT."
    },
    {
      "object": "fine-tune-event",
      "created_at": 1614807864,
      "level": "info",
      "message": "Job succeeded."
    }
  ]
}
```

### cancelFineTune
```cancelFineTune(modelId) => Promise<response>```

##### Parameters:
```modelId: string```: ID of fine-tuned model to cancel

##### Sample Response:
```
{
  "id": "ft-xhrpBbvVUzYGo8oUO1FY4nI7",
  "object": "fine-tune",
  "model": "curie",
  "created_at": 1614807770,
  "events": [ { ... } ],
  "fine_tuned_model": null,
  "hyperparams": { ... },
  "organization_id": "org-...",
  "result_files": [],
  "status": "cancelled",
  "validation_files": [],
  "training_files": [
    {
      "id": "file-XGinujblHPwGLSztz8cPS8XY",
      "object": "file",
      "bytes": 1547276,
      "created_at": 1610062281,
      "filename": "my-data-train.jsonl",
      "purpose": "fine-tune-train"
    }
  ],
  "updated_at": 1614807789,
}
```

### moderation
```moderation(input, model = 'moderation', user) => Promise<response>```

##### Parameters:
```input: string```: Text to moderate
```model: string```: Name of model to use for moderation. Defaults to `moderation`
```user: string```: User ID to use for moderation

##### Sample Response:
```
{
  "id": "modr-5MWoLO",
  "model": "text-moderation-001",
  "results": [
    {
      "categories": {
        "hate": false,
        "hate/threatening": true,
        "self-harm": false,
        "sexual": false,
        "sexual/minors": false,
        "violence": true,
        "violence/graphic": false
      },
      "category_scores": {
        "hate": 0.22714105248451233,
        "hate/threatening": 0.4132447838783264,
        "self-harm": 0.005232391878962517,
        "sexual": 0.01407341007143259,
        "sexual/minors": 0.0038522258400917053,
        "violence": 0.9223177433013916,
        "violence/graphic": 0.036865197122097015
      },
      "flagged": true
    }
  ]
}
```