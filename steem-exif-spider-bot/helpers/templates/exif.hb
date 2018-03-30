EXIF Data for your Photo

> <img src="{{url}}" width="25" />

|Tag Name|Value|Description|
|--------|-----|-----------|
{{#each tags}}
{{#if name}}
|{{name}}|{{value}}|{{description}}|
{{/if}}
{{/each}}