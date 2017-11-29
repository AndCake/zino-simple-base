Zino simple base
================

This repository holds a simple starting kit for a zino project with server-side rendering and 90% isomorphic code.

Simply create your components in a directory pages/ . Add your routes in routes.json . 

It supports JSX for writing components. It supports cssnext through postcss and ES6 through bublé.

Routes
------

Routes resolve a URL to either a component or a REST interface. This happens through the routes.json file, which defines which URL should be routed to what.

The general structure for this JSON file is as follows:

    {
        "/route-path": {
            "name": "route-name",
            "component": "page-component",
            "title": "Optional title"
        },
        "/route-path/with:parametera-:parameterb.html": {
            "name": "parameterized-route",
            "component": "page-component"
        },
        "/different-route-path": {
            "name": "rest-route",
            "rest": "<path-to-rest-api-file>:<fn-to-call>"
        }
    }

The `/route-path` can be any absolute URL path (without query parameters). You can add dynamic properties of the path by providing a `:<parameter>`, whereas `<parameter>` is the name a parameter should have when provided to a component or given to the REST API.

The route's `name` property defines a unique name that can be used to generate a URL based on given data by using `Router.getUrl(name[, data])`. Example for the above JSON structure:

    let url = Router.getUrl('parameterized-route', {
        parametera: 'test',
        parameterb: 123
    });

    // => url === '/route-path/withtest-123.html'

`page-component` identifies the component within the `public/pages/` directory to be rendered. Typically it would be directly in that directory since it refers to an entire page rather than a sub component.

The `title` property of a route is used to pre-define the page's title. So it does not apply to REST API routes.

If `<fn-to-call>` is omitted, the request method ('get', 'post', 'put', etc...) will be used as a default function name to call.
