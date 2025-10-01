# Task: Bundling

The output for this project will live in packages/bundle (ignore bundle-react, and also the existing code in bundle is currently slop that doesnt work or even adhere to the interfaces below)

You should test this code with simple examples. We should pick a very simple hello app, bundle it, then use playwright to validate shouldRenderProperly. In fact, `shouldRenderProperly(indexHtmlPath)` is perhaps a function that you should implement. You could maybe add params to it but its ok if all you do is assume the indexfile should always render the same thing on screen regardless of the underlying code / bundling. Then we use this fnuction as we add more things. 

The only cases we care about right now are
- bundle() called on a react project
- bundleReactComponent called on a react project

and the failure cases to handle properly are:
- bundleReactComponent is called on a file that does not default export a component - should throw some kind of useful error.


## Subtask: Set up turbo package
- just like all the other packages

## Subtask: Generic bundler.

We're going to use vite, along with the vite single-file plugin, and any framework specific plugins we may need.

I would like to structure this so that the first step of the process is to determine which plugins we need by looking at or inferring the application's framework, and possibly also as a function of the inputs.

```ts
type BundleOptions = {
    // points to an either a react component.tsx or an index.html that may reference other files like css or src/main.tsx 
    // path is absolute, OR relative to the user's cwd when they call the script.
    entrypoint: string,

    // path to a directory that should receive the built output, which is also an index.html
    // path is absolute, OR relative to the user's cwd when they call the script.
    // so the structure would be <out>/index.html
    out: string, 
}

// This function determines what framework someone is using.
// Options are: vue, sveltekit, react, or undefined
// I would like you to propose options for how to implement this.
// An idea I have is to recurse outward
async function detectFramework(entrypoint: string) {
    throw new Error("Implement me!)
}

// Should actually return an array of plugins to include
async function getVitePlugins(args: BundleOptions): unknown {
    throw new Error("Implement me!)
}

// This function bundles an index.html and turns it into a single html
// It should use vite and vite's single-file plugin, along with any of the plugins we find
// input file must be a ".html" and not a ".tsx" 
async function bundle(args: BundleOptions): Promise<void> {
    const vitePlugins = getVitePlugins(args);
    // ... rest of implementation ... 
    throw new Error("Implement me!)
}
```

## Subtask: React component bundler

I want to provide a convenient option for react devs who have a component in a .tsx file. 

```tsx
// This function creates an output index.html bundle from a .tsx file which default exports a component.
// entrypoint must be a ".tsx" and not an html
// Assert that the .tsx default exports a component - possibly using tsc?  Need your help here.
// it should create a basic temporary html file and a temporary main.tsx file that bootstraps the exported component into the html.
// Once we have this temporary index.html and main.tsx, we should delegate to bundle(...), passing the path of the temp html as entrypoint
async function bundleReactComponent(args: BundleOptions): Promise<void> {
    throw new Error("Implement me!)
}

```