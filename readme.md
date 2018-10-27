# Node Serverless Helpers

Node Serverless Helpers is a package meant to make your life easier when 
developing lambda functions in NodeJS.

## Usage

Install the package with npm or yarn.

```bash
npm install node-serverless-helpers
# or 
yarn add node-serverless-helpers
```

Here is a sample working code.

```typescript
// hello.js
import {handle} from 'node-serverless-helpers';

export const world = handle(async (event) => {
    return 'hello lambda world!';
});
```

The important part is the `handle` function that does 3 things.

 1. Run the `init` function. You can register init handlers by calling
  the `register` function.
 2. Run the front controller. Its job is to figure out what source the 
  event comes from, and add useful middlewares to it.
 3. Run your function, and wrap the result to the expected format.

## License

[ISC - Copyright 2018 Thomas Ruiz](https://github.com/thomasruiz/node-serverless-helpers/blob/master/LICENCE)
