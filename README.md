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

### getModels
```getModels() => Promise<response>```

Sample Response:
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

Sample Response:
```
{
  "id": "text-davinci-003",
  "object": "model",
  "owned_by": "openai",
  "permission": [...]
}
```

### completion
```completion(messages = [], resultCount = 1, stop, options = { model: 'gpt-3.5-turbo' }) => Promise<response>```

Sample Response:
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
```completionStream(messages = [], resultCount = 1, stop, options = { model: 'gpt-3.5-turbo' }) => Promise<ResponseStream>```

#### ResponseStream
A ResponseStream EventEmitter that manages the response events from the OpenAI API. Manage the stream with the following methods:
```
onComplete: () => void
onData = (data: string[]) => void
```
```
completionStream([Message('Test message, send me back 10 resposes.', 'user')]).then(stream => new Promise((res) => {
    let d = '
    stream.onComplete = () => {
        console.log('Stream Complete: ', data);
        res(d)
    }
    stream.onData = (data) => {
        console.log('Stream Data: ', data);
        d += data;
    }
}).catch(console.error)
```

### chatCompletion
```chatCompletion(messages = [], resultCount = 1, stop, options = { model: 'gpt-3.5-turbo' }) => Promise<response>```

Sample Response:
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
see [completionStream](#completionStream)

### edit
```edit(instruction, input, numberOfEdits, options = {model: 'text-davinci-edit-001'}) => Promise<response>```

Sample Response:

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
Maximum result count is ```10```.
Possible Image Sizes: 
```
{
  0: '256x256',
  1: '512x512', 
  2: '1024x1024
}
```
Possible response formats are ```url``` or ```b64_json``` or use ```file``` to return the image as a buffer as well as the url.
Sample Response:
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
Maximum result count is ```10```.
See [generateImage](#generateImage) for possible image sizes.
May use response types ```url``` or ```b64_json``` or use ```file``` to return the image as a buffer as well as the url.
Sample Response:
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
Maximum result count is ```10```.
See [generateImage](#generateImage) for possible image sizes.
May use response types ```url``` or ```b64_json``` or use ```file``` to return the image as a buffer as well as the url.
Sample Response:
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

Sample Response:
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
```getTranscription(file, prompt = '', language = 'en', responseFormat = 'json', temperature = 0) => Promise<response>```

Sample Response:
```
{
  "text": "Imagine the wildest idea that you've ever had, and you're curious about how it might scale to something that's a 100, a 1,000 times bigger. This is a place where you can get to do that."
}
```

### getTranslation
```getTranslation(file, prompt, responseFormat, temperature) => Promise<response>```

Sample Response:
```
{
  "text": "Hello, my name is Wolfgang and I come from Germany. Where are you heading today?"
}
```

### getFiles
```getFiles() => Promise<response>```

Sample Response:
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

Sample Response:
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
File content as utf-8 string.

### uploadFile
```uploadFile(file, fileName, fileType, filePurpose) => Promise<response>```

Sample Response:
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

Sample Response:
```
{
  "id": "file-XjGxS3KTG0uNmNOK362iJua3",
  "object": "file",
  "deleted": true
}
```

### getFineTunedModels
```getFineTunedModels() => Promise<response>```

Sample Response:
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

Sample Response:
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

Sample Response:
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

Sample Response:
```
{
  "id": "curie:ft-acmeco-2021-03-03-21-44-20",
  "object": "model",
  "deleted": true
}
```

### getFineTuneEvents
```getFineTuneEvents(modelId) => Promise<response>```

Sample Response:
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

Sample Response:
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

Sample Response:
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