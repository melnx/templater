# templater

templater is a lightweight templating library that requires zero coding

there are no controllers, no special expressions, just special attributes

#### inline templates and data binding

```html
 <script>
    numbers = [
      { a:5, b:4, subs:[{a:1,b:2, chars:[{a:"a",b:"b"}] },{a:4,b:6, chars:[{a:"a",b:"b"}] }] },
      { a:1, b:2, subs:[{a:1,b:2, chars:[{a:"a",b:"b"}] },{a:3,b:4, chars:[{a:"a",b:"b"}] }] }
    ];
    function sum(a,b) {
        return a+b;
    }
  </script>

  <div scopes="numbers" as="number">
    <h3>{1+parseInt($index)} / {numbers.length} ::   {number.a} + {number.b} = {a + b}   Is it less than 5? {a+b<5 ? "YES" : "NO"}</h3>
    <div scopes="subs" as="sub">
      <h4>{sub.a} + {sub.b} = {sum(a,b)}</h4>

      <div scopes="chars" as="char">
        <sup>{char.a} + {char.b} = {a+b}</sup>
      </div>
    </div>
    <br />
  </div>
```

note: curly brace bindings let you simply specify variable names (`number.a` or simply `a`) and/or expressions, all javascript is valid including function calls ( `a+b` or `sum(a,b)` )

- `scope` attribute to bind a window/iterator object to a template (single object bound to a template)
- `scopes` attribute to iterate over the object/array and render a template instance for each key of the object/array
- `as` to name the iterator which you can reference for inner bindings (by default they are named "item")

within templates you can access special loop variables. to access outer loop variables simply reference the iterator's `as` alias

- `$index` gets the index currently being rendered.
- `$key` same as index but not numeric
- `$value` gets the value of the current iterator (useful in case values are just strings)
- `$id` gets the id of the current template (useful to reference specific template instances via javascript)

#### non-inline templates

if you need to use a template in more than one place you can define it in a <script> tag

```html
  <script type="text/html" id="teams" as="team">
    ...
  </script>

  <div template="teams" scopes="teams"></div>

  <div template="teams" scopes="teams2"></div>
```

this lets you bind two separate objects to the teams template, note the following:

- `template` attribute lets you reference templates by id
- `as` on a template script tag lets you set the alias for the `scope`/`scopes` of the template instance

### re-rendering

you can use special functions to affect the display of the databinding/data

- `$rebind()` updates the rendering of all the templates by default, passing the scope name only updates the specified template instances
- `$remove(id)` removes the template instance and the item from its parent object, you can use `$id` loop variable for this
- `$add(id, scope, value)` adds a new item to the parent with `id`'s collection named `scope` with value `value`, reference your outer iterator to retrieve the outer $id (`team.$id`)


### scope expressions

scopes accept expressions as well as variable names.  the root binding references the window's variable with the provided name.

however you can also have dynamic scopes such as

```html
  <table>
    <tr>
     <th scopes="Object.keys(products[0])">{$value}</th>
    </tr>
    <tr scopes="products">
      <td>{id}</td>
      <td>{base_currency}</td>
      <td>{quote_currency}</td>
      <td>{base_min_size}</td>
      <td>{base_max_size}</td>
      <td>{quote_increment}</td>
      <td>{display_name}</td>
      <td>{margin_enabled}</td>
    </tr>
  </table>

  <script>
    ajax('https://api.gdax.com/products/', function(data) {
        window.products = JSON.parse(data);
        $rebind();
    })
  </script>
```

or even simpler

```html
  <table>
    <tr>
     <th scopes="Object.keys(products[0])">{$value}</th>
    </tr>
    <tr scopes="products">
      <td scopes="item">{$value}</td>
    </tr>
  </table>
```

note how the header of the table uses the javascript expression which retrieves the keys of the first object

#### TODO

- magicaly figure out when re-rendering is required in order to not require `$rebind()` calls
- more special attributes such as `if` and `for`