This repo is a template. Given a tsv file, the user can choose which nodes(columns) to show in a network. Three layouts - circular, random and force. The logic for edg-materialization needs to be coded. This visualization uses several elements from [sigmajs demo](https://github.com/jacomyal/sigma.js/tree/main/packages/demo) and [sigmjs_storybook](https://github.com/jacomyal/sigma.js/tree/main/packages/storybook). It is built using [Vite](https://vitejs.dev/), and uses [react-sigma](https://sim51.github.io/react-sigma/), to interface sigma.js with React.

Install dependendencies ```npm install graphology graphology-components graphology-layout-forceatlas2 graphology-layout papaparse sigma```.

Run ```npm run dev``` to upload file and visualize.
