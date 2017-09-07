//(function(){
function getScope(element) {
    var scope = null;

    while(!scope) {
        if(!element) break;
        scope = element.context;
        element = element.parentNode;
    }

    return scope;
}

function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function getParentScope(element) {
    var scope = null;

    var scope_count = 0;

    while(!scope) {
        if(!element) break;
        if(element.context) {
            scope_count++;
        }

        if(scope_count == 2) {
            scope = element.context;
        }

        element = element.parentNode;
    }

    return scope;
}

function getXPath(element) {
  var paths = [];  // Use nodeName (instead of localName)
  // so namespace prefix is included (if any).
  for (; element && element.nodeType == Node.ELEMENT_NODE;
         element = element.parentNode)
  {
    var index = 0;
    var hasFollowingSiblings = false;
    for (var sibling = element.previousSibling; sibling;
         sibling = sibling.previousSibling)
    {
      // Ignore document type declaration.
      if (sibling.nodeType == Node.DOCUMENT_TYPE_NODE)
        continue;

      if (sibling.nodeName == element.nodeName)
        ++index;
    }

    for (var sibling = element.nextSibling;
         sibling && !hasFollowingSiblings;
         sibling = sibling.nextSibling)
    {
      if (sibling.nodeName == element.nodeName)
        hasFollowingSiblings = true;
    }

    var tagName = (element.prefix ? element.prefix + ":" : "")
      + element.localName;
    var pathIndex = (index || hasFollowingSiblings ? "["
      + (index + 1) + "]" : "");
    paths.splice(0, 0, tagName + pathIndex);
  }

  return paths.length ? "/" + paths.join("/") : null;
};

function createXPathFromElement(elm) {
  var allNodes = document.getElementsByTagName('*');
  for (var segs = []; elm && elm.nodeType == 1; elm = elm.parentNode)
  {
    if (false && elm.hasAttribute('id')) {
      var uniqueIdCount = 0;
      for (var n=0;n < allNodes.length;n++) {
        if (allNodes[n].hasAttribute('id') && allNodes[n].id == elm.id) uniqueIdCount++;
        if (uniqueIdCount > 1) break;
      };
      if ( uniqueIdCount == 1) {
        segs.unshift('id("' + elm.getAttribute('id') + '")');
        return segs.join('/');
      } else {
        segs.unshift(elm.localName.toLowerCase() + '[@id="' + elm.getAttribute('id') + '"]');
      }
    } else if (elm.hasAttribute('class')) {
      segs.unshift(elm.localName.toLowerCase() + '[@class="' + elm.getAttribute('class') + '"]');
    } else {
      for (i = 1, sib = elm.previousSibling; sib; sib = sib.previousSibling) {
        if (sib.localName == elm.localName)  i++; };
      segs.unshift(elm.localName.toLowerCase() + '[' + i + ']');
    };
  };
  return segs.length ? '/' + segs.join('/') : null;
};

function lookupElementByXPath(path) {
  var evaluator = new XPathEvaluator();
  var result = evaluator.evaluate(path, document.documentElement, null,XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  return  result.singleNodeValue;
}

function setCaretPosition(elem, caretPos) {
  if(elem != null) {
    if(elem.createTextRange) {
      var range = elem.createTextRange();
      range.move('character', caretPos);
      range.select();
    }
    else {
      if(elem.selectionStart) {
        elem.focus();
        elem.setSelectionRange(caretPos, caretPos);
      }
      else
        elem.focus();
    }
  }
}


if(typeof debug_templater == 'undefined') debug_templater = false;
if(typeof preview_templater == 'undefined') preview_templater = false;

function updatePreview() {

    if(!preview_templater) return;

    if(!document.getElementById('__json_data') ) {
        var preview = document.createElement('div');
        preview.innerHTML = '<pre id="__json_data" style="font-size:10px; position:fixed; top:110px; right:20px; width:400px; z-index:5000; max-height:1000px; overflow-y:scroll;"></pre>'
        document.body.appendChild(preview.childNodes[0]);
    }

    //if(debug_templater) console.log( JSON.stringify(window[templater_debug_target], null, 2) );
    document.getElementById('__json_data').innerHTML = escapeHtml(JSON.stringify(window[templater_debug_target], null, 2));
}

function getDomUsagesOfObject(obj) {
    var result = [];
    for(var id in context_element_map) {
        var usage = context_element_map[id];

        if(id == obj) {
            result.push(usage)
        }
    }
    return result;
}

function $remove(item, confirmation, cb, cb_param) {
    var usages = getDomUsagesOfObject(item);
    for(var u in usages) {
        var usage = usages[u];

        removeTemplateInstance(usage.id, usage.parent_scope, confirmation, cb, cb_param);
        delete context_element_map[usage.id];
    }
}

function removeTemplateInstance(id, parent_scope, confirmation, cb, cb_param) {
    //if(!confirm("Are you sure you want to remove this item?") ){
    //    return
    //}

    if(confirmation === true) {
      confirmation = "Are you sure you want to remove this item?";
    }

    function removeItem() {
      var depth = 0;

      if (depth == undefined) {
        depth = 0;
      }

      var el = document.getElementById(id);

      if (typeof parent_scope == 'string') {
        if (debug_templater) console.log("ITS A STRING");
        var actual_parent_scope = getParentScope(el);
        if (debug_templater) {
          console.log("actual parent scope");
          console.log(actual_parent_scope);
        }
        parent_scope = actual_parent_scope[parent_scope];
      }

      if (parent_scope) {
        if (parent_scope instanceof Array) {
          parent_scope.splice(parent_scope.indexOf(el.context), 1);
        } else {
          delete parent_scope[indexOfObj(el.context, parent_scope)];
        }
        if (debug_templater) console.log(parent_scope);
      }

      updatePreview();

      var parent = el;

      for (var i = 0; i < depth; i++) {
        parent = parent.parentNode;
      }

      //closeConfirmModal();

      setTimeout(function () {
        parent.remove();
        if(cb) {
          cb(cb_param);
        }
      }, 500);
    }


    if(confirmation === false || confirmation == undefined) {
      removeItem();
    }else {
      if(confirm(confirmation)) {
        removeItem();
      };
    }
}

function decodeHtml(html) {
  var txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function evalExpression(expr, scope_stack) {
  console.log("expr: " + expr);
  console.log("scope stack:");
  console.log(scope_stack);

  var code = "(function(){";
  for(var i=0; i<scope_stack.length; i++) {
    var scope =  scope_stack[i];

    code += "with( ";

    if(typeof scope == "string") {
      code += "window";

      for (var j = 0; j <= i; j++) {
        var scope2 = scope_stack[j];

        if(typeof scope2 != "string") continue;

        code += "['" + scope2 + "']";
      }
    }else {
      code += JSON.stringify(scope)
    }

    code += "){";
  }

  code += "return " + decodeHtml(expr)

  for(var i=0; i<scope_stack.length; i++) {
    code += "}";
  }

  code += "})()";

  console.log(code);

  return eval(code);
}

var template_regex = /(\{([^\}]+)\})/g;
var expr_regex = /{([^}]*)}/;

function dataBindTemplateHtml(html, params, parent_scope, key_field, special_scope, scope_stack) {

    console.log(special_scope);

    var m = null;

    var updated_bindings = {};

    var i = 0;

    console.log("BEFORE BINDING:");
    console.log(html);

    var matches = html.match(template_regex);

    var replaced = {};

    //do {

    for(var j=0; j<matches.length; j++){

        var match = matches[j];

        if(replaced[match]) continue;

        console.log(match);

        replaced[match] = true;

        var m = [match, match, expr_regex.exec(match)[1] ]

        //console.log("I: " + i);
        //console.log(html);
        //m = template_regex.exec(html);

        //console.log("M:")
        //console.log(m);

        if (m) {

            //console.log(html);
            console.log("BINDING: " + m[1]);

            if(updated_bindings[ m[1] ]) continue;

            if(params[m[2]] instanceof Array) {
                continue;
            }

            var updatedBinding = null;
            /*if(m[1].indexOf('.') >= 0) {

                var updatedPath = m[2];

                //replace 1 item in front of . separated references   a.b.c -> b.c
                var prefixes = m[2].match(/[0-9A-Z_$\.]*%?\./ig, '');
                for(var p=0; p<prefixes.length; p++) {
                  var prefix = prefixes[p];
                  var prefixParts = prefix.split('.');
                  prefixParts.splice(0,1);
                  var updatedPrefix = prefixParts.join('.');
                  updatedPath = updatedPath.replace( new RegExp(escapeRegExp(prefix), 'g'), updatedPrefix )
                }

                updatedBinding = '{' + updatedPath + '}';
                updated_bindings[ updatedBinding ] = true;
                console.log("UPDATED BINDING:" + m[1] + "->" + updatedBinding);
            }*/

            var key = m[2]

            var replaceSpaces = false;

            if(key.startsWith('[') && key.endsWith(']')) {
               key = key.substring(1, key.length-1);
               replaceSpaces = true;
            }

            //console.log("KEY:" + key);
            var value = typeof params == "string" ? params : evalExpression(m[2], scope_stack); //params[key];

            //if(debug_templater)
            console.log("replace " + m[1] + " with " + value);

            if(key[0] == '$') {
              value = special_scope[key];
            }

            if(replaceSpaces) {
              value = value.replace(/ /, '_');
            }

            if(value && typeof value === 'string') {
              var escaped = escapeHtml(value);
              value = escaped;
            }

            if(value === false) {
              value = "false";
            }

            html = html.replace( new RegExp( escapeRegExp(m[1]), 'g'), updatedBinding || value || '');
            //html = html.replace( m[1], updatedBinding || value || '');

            //console.log("AFTER");
            //console.log(html);
        }

        i++;
    }// while (m);

    console.log("AFTER BINDING:");
    console.log(html);


    return html;
}

function getChangeHandler(input, changeHandler) {
  var oldHandler = input.onchange;

  var handler = oldHandler ? function(event){
      oldHandler(event); changeHandler(event)
    } : changeHandler;

  return handler;
}

function getNewId() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function dataBindInputs(element, context, parent_scope, key_field) {

    var last_valid_value = null;
    var use_last_valid_value = false;
    var original_border_style = element.style.border;

    var last_valid_values = {};
    var use_last_valid_values = {};
    var original_border_styles = {};

    function changeHandler(event) {
        var value = event.target.type == 'checkbox' ? event.target.checked : event.target.value;

        var key = event.target.getAttribute('key');
        var input_id = event.target.id;

        if(debug_templater) console.log(event);
        if(debug_templater) console.log("changed: " + key  + " = " + value);

        var old_value = context[key];
        context[key] = value;

        if(debug_templater) {
            console.log("key: " + key);
            console.log("key field: " + key_field);
            console.log("old value: " + old_value);
            console.log("new value: " + value);
        }

        if(use_last_valid_values[input_id]) {
          old_value = last_valid_values[input_id];
          //old_value = last_valid_value;
        }

        if(value == old_value) {
          event.target.style.border = original_border_styles[input_id];
        }

        if(key == key_field && old_value != value) {

            if(!parent_scope[value]) {

              last_valid_values[input_id] = value;
              use_last_valid_values[input_id] =  false;

              event.target.style.border = original_border_styles[input_id];

              parent_scope[value] = context;

              delete parent_scope[old_value]
            }else{
              use_last_valid_values[input_id] = true;

              event.target.style.border = '1px solid red';
            }
        }

        if(debug_templater) {
            //console.log("updated context");
            //console.log(context);
            //console.log(parent_scope);
        }

        updatePreview();
    }

    var inputs = element.getElementsByTagName('input');

    for(var i=0; i<inputs.length; i++) {
        var input = inputs[i];

        if(!input.id) input.id = getNewId();

        last_valid_values[input.id] = input.value;
        original_border_styles[input.id] = input.style.border;

        var handler = changeHandler; //getChangeHandler(input, changeHandler)

        //input.onchange = handler;
        input.addEventListener('change', handler);
        input.addEventListener('keyup', handler);
    }

    var textareas = element.getElementsByTagName('textarea');
    for(var i=0; i<textareas.length; i++) {
        var input = textareas[i];

        if(!input.id) input.id = getNewId();

        last_valid_values[input.id] = input.value;
        original_border_styles[input.id] = input.style.border;

        var handler = changeHandler;// getChangeHandler(input, changeHandler)

        //input.onchange = handler;
        input.addEventListener('change', handler);
        input.addEventListener('keyup', handler);
    }

    var selects = element.getElementsByTagName('select');
    for(var i=0; i<selects.length; i++) {
        var select = selects[i];

        if(!select.id) select.id = getNewId();

        last_valid_values[select.id] = select.value;
        original_border_styles[select.id] = select.style.border;

        var handler = changeHandler;//getChangeHandler(select, changeHandler)

        //select.onchange = handler;
        input.addEventListener('change', handler);
    }

}

function addInputKeys(element) {
    function addKey(input, value) {
        value = value.trim();
        if(value[0] == '{' && value[value.length-1] == '}') {
            value = value.replace('{','').replace('}','');
            var value_parts = value.split('.');
            value = value_parts[value_parts.length-1];

            input.setAttribute('key', value);
        }
    }

    var inputs = element.getElementsByTagName('input');
    for(var i=0; i<inputs.length; i++) {
        var input = inputs[i];
        var value = input.value;

        if(value) {
            addKey(input, value);
        }
    }
    var textareas = element.getElementsByTagName('textarea');
    for(var i=0; i<textareas.length; i++) {

        var input = textareas[i];
        var value = input.innerText;

        if(value) {
            addKey(input, value);
        }
    }

    var selects = element.getElementsByTagName('select');
    for(var i=0; i<selects.length; i++) {
        var select = selects[i];
        var value = select.getAttribute('val');
        if(value) {
            addKey(select, value);
        }
    }
}

function setCheckboxValues(instance, params) {
    var inputs = instance.getElementsByTagName('input');
    for(var i=0; i<inputs.length; i++) {
        var input = inputs[i];

        if(input.type != "checkbox") continue;

        if(params[input.getAttribute('key')]) {
            input.checked = true;
        }
    }
}


function indexOfObj(object, scope) {
    for(var k in scope) {
        if(scope[k] == object) {
            return k;
        }
    }
    return -1;
}

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

var context_element_map = {};

function insertAfter(newNode, referenceNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function insertAfterLastInstance(newNode, referenceNode) {
  var template_id = referenceNode.id;

  while( (referenceNode.nextSibling.id || "").indexOf(template_id) >= 0) {
    referenceNode = referenceNode.nextSibling;
  }

  insertAfter(newNode, referenceNode);
}

var original_template_styles = {};

function addTemplateInstance(id, params, parent_scope, key_fields, depth, fallback_key, scope_stack) {
    if(typeof depth == 'undefined') {
        depth = 0;
    }

    if(typeof scope_stack == 'undefined') {
      console.log("INIT SCOPE STACK");
      scope_stack = [fallback_key];
      console.log(scope_stack);
      console.trace();
    }

    var key_field = key_fields;
    if(typeof key_fields != 'undefined' && key_fields !== null) {
        key_field = (typeof key_fields == "string") ? key_fields : key_fields[depth];
    }

    if(debug_templater) {
        console.log("new scope");
        console.log(params);

        console.log("parent scope");
        console.log(parent_scope);
    }

    var template = document.getElementById(id);

    if(!template) {
      console.error("no template with found id: " + id);
    }

    var as = template.getAttribute("as") || "item";

    addInputKeys(template);

    if(typeof parent_scope == 'string') {
        var actual_parent_scope = getScope(template);
        if(debug_templater) {
          console.log("Actual parent scope");
          console.log(actual_parent_scope);
        }
        parent_scope = actual_parent_scope[parent_scope];
    }

    if(parent_scope) {

        if( parent_scope instanceof Array ) {
            if (parent_scope.indexOf(params) < 0) {
                parent_scope.push(params)
            }
        }else if(key_fields){
            if(indexOfObj(params, parent_scope)) {
                parent_scope[params[key_field] || fallback_key] = params;
            }
        }

        if (debug_templater) {
            //console.log("current scope: ");
            //console.log(parent_scope);
        }
    }

    updatePreview();

    if(!original_template_styles[template.id]) {
      original_template_styles[template.id] = template.getAttribute('style');
    }

    template.style.display = "none";

    var parent = template.parentNode;
    var index = parent.childElementCount;

    while(document.getElementById(template.id + "-" + index)) {
      index++;
    }

    if(key_fields) {
      if(typeof key_fields == 'string') {
        index = params[key_fields].replace(/ /g, '_');
      }else if(key_fields[depth]) {
        if(debug_templater) {
          if(!params[key_fields[depth]]) {
            console.log("BAD DATA/KEY NAME");
          }
        }

        if(params[key_fields[depth]]) {
          index = params[key_fields[depth]].replace(/ /g, '_');
        }
      }
    }

    var instance = document.createElement(template.tagName != "SCRIPT" ? template.tagName : "div");
    instance.id = template.id + "-" + index;

    var html = template.innerHTML;

    html = html.replace(new RegExp(escapeRegExp(id), 'g'), id + '-' + index);
    //html = replaceAllStrings(html, id, id + '-' + index)

    if(debug_templater > 2) {
      console.log("replacing ids:" + id + " -> " + id + '-' + index);
    }

    instance.innerHTML = html;
    var sub_templates = instance.querySelectorAll('[scope], [scopes]');
    var placeholder_map = {};
    //console.log("SUB TEMPLATES");
    //console.log(sub_templates);
    for(var t = 0; t<sub_templates.length; t++) {
      var sub_template = sub_templates[t];
      var placeholder = document.createElement("div");
      placeholder.setAttribute('placeholder', true);
      placeholder.setAttribute('index', t)
      placeholder_map[ t ] = sub_template;
      sub_template.replaceWith(placeholder)
    }
    html = instance.innerHTML

    //console.log("parseInt(" + fallback_key +") = " + parseInt(fallback_key))

    var special_scope = {
        $key: fallback_key,
        $index: fallback_key,
        $value: params,
        $id: id + '-' + index,
    };

    if(params) {
      for(var k in special_scope) {
        params[k] = special_scope[k]
      }

      html = dataBindTemplateHtml(html, params, parent_scope, key_field, special_scope, scope_stack);
    }

    instance.innerHTML = html;

    for(var t in placeholder_map) {
      var sub_template = placeholder_map[t];
      var placeholders = instance.querySelectorAll('[index="' + t +'"]');
      placeholders[0].replaceWith(sub_template);
    }

    instance.context = params;

    if(template.className) {
      instance.className = template.className;
    }

    //if(original_template_styles[template.id]) {
      //instance.setAttribute("style", original_template_styles[template.id]);
    //}
    //instance.style.display = 'block';

    setCheckboxValues(instance, params);
    dataBindInputs(instance, params, parent_scope, key_field);

    instance.setAttribute('instance', true);

    //parent.appendChild(instance);
    insertAfterLastInstance(instance, template);

    if(params) {

          for (var key in params) {
            var val = params[key];

            var child_template_id = id + '-' + index + '-' + key;
            var child_template = document.getElementById(child_template_id);

            if (child_template) {
              var as = child_template.getAttribute("as") || "as";

              if (val instanceof Array || val instanceof Object) {

                if (child_template.getAttribute('single')) {
                  var new_scope_stack = scope_stack.slice(0);
                  new_scope_stack.push(key);

                  if(as && as != key) {
                    parent_scope[as] = parent_scope[key];
                  }

                  var instance_id = addTemplateInstance(child_template_id, val, parent_scope, key_fields, depth + 1, key, new_scope_stack);
                  context_element_map[instance_id] = { obj: val[m], parent_scope: parent_scope, id:instance_id }

                  if(as != key) {
                    delete parent_scope[as];
                  }
                } else {

                  for (var m in val) {

                    var new_scope = val[m];

                    var new_scope_stack = scope_stack.slice(0);
                    new_scope_stack.push(key);
                    new_scope_stack.push(m);


                    if(as && as != m) {
                      val[as] = val[m];
                    }

                    //console.log("trying to get template: " + child_template_id);

                    var instance_id = addTemplateInstance(child_template_id, new_scope, val, key_fields, depth + 1, m, new_scope_stack);
                    context_element_map[instance_id] = { obj: new_scope, parent_scope: val, id:instance_id };

                    if(as != m) {
                      delete val[as];
                    }
                  }
                }

              }
            }
          }

    }

    var selects = instance.getElementsByTagName('select');
    for(var s in selects) {
        var select=selects[s];
        if(!select.getAttribute) continue;
        select.value = select.getAttribute('val');
    }

    for(var k in special_scope) {
        delete params[k];
    }

    return id + '-' + index;
}

function addTemplateInstances(id, items, key_field, scope_stack){
    console.log("ADD INSTANCES SCOPE STACK");
    console.log(scope_stack);

    for(var i in items){
        var new_scope_stack = scope_stack;
        var as = null;

        if(scope_stack) {
          new_scope_stack = scope_stack.slice(0);
          new_scope_stack.push(i);
          //console.log("NEW SCOPE STACK");
          //console.log(new_scope_stack);
          var template = document.getElementById(id);
          as = template.getAttribute("as");
          if(as) {
            items[as] = items[i];
          }
        }

        var instance_id = addTemplateInstance(id, items[i], items, key_field, undefined, i, new_scope_stack);
        context_element_map[instance_id] = { obj: items[i], parent_scope: items, id:instance_id } //items[i];

        if(as && as != i) {
          delete items[as];
        }
        //items[i].watch(watchObjectHandler);
    }
}

function watchObjectHandler(change) {
  console.log(change);
}

function recursivelyMarkTemplates(template, parent_scope) {

  var multi_scope = template.getAttribute('scopes');
  var single_scope = template.getAttribute('scope');
  var scope = single_scope || multi_scope;
  var scope_parts = scope.split('.');
  scope = scope_parts[scope_parts.length-1];

  //console.log("SCOPE: " + scope);
  var id = (parent_scope ? parent_scope + '-' : '') + scope;
  //console.log(id);
  template.setAttribute('id',  "tmpl-" + id);

  if(single_scope) {
    template.setAttribute('single', true);
    //console.log("SINGLE SCOPE: " + single_scope);
  }

  var sub_templates = template.querySelectorAll('[scope], [scopes]');

  for(var s = 0; s < sub_templates.length; s++) {
    var sub_template = sub_templates[s];

    if(sub_template.getAttribute('id')) continue;

    recursivelyMarkTemplates(sub_template, id);
  }
}

function clearTemplates() {
  var instances = document.querySelectorAll('[instance]');

  for(var i = 0; i<instances.length; i++) {
    instances[i].remove();
  }

  var templates = document.querySelectorAll('[scope], [scopes]');
  for(var t = 0; t<templates.length; t++) {
    var template = templates[t];
    template.removeAttribute('id');
  }
}

function isExpression(str) {
    var trimmed=  str.trim();
    return trimmed.startsWith('{') && trimmed.endsWith('}');
}

function renderTemplates() {

  var includes = document.querySelectorAll('[template]');

  for(var i = 0; i<includes.length; i++) {
    var include = includes[i];

    var template_id = include.getAttribute("template");

    var template = document.getElementById(template_id);

    if (template){
      var html = template.innerHTML;
      var as = template.getAttribute("as") || "item";
      include.innerHTML = html;
      if(as) {
          include.setAttribute("as", as);
      }
    }else{
      console.error("template not found with id " + template_id);
    }
  }

  var templates = document.querySelectorAll('[scope], [scopes]');

  for(var t = 0; t<templates.length; t++) {
    var template = templates[t];

    if( template.getAttribute('id') ) continue;

    var scope = template.getAttribute('scope') || template.getAttribute('scopes');

    recursivelyMarkTemplates(template);

    var scope_object = window[scope];
    var scope_parent = window;

    //if(isExpression(scope)) {
        //scope = expr_regex.exec(scope)[1]
        scope_object = evalExpression(scope, []);
    //}

    if( template.getAttribute('single') ) {
      addTemplateInstance(template.getAttribute('id'), scope_object, scope_parent, null, 0, scope)
    }else {
      //console.log("ROOT SCOPE STACK: " )
      //console.log([scope])
      addTemplateInstances(template.getAttribute('id'), scope_object, undefined, [scope]);
    }

  }
}

function rebindTemplates() {
  var path = null;
  var cursor_position = null;
  if(document.activeElement) {
    console.log(document.activeElement.value)
    path = getXPath(document.activeElement);

    if( document.activeElement.selectionStart ) {
      cursor_position = document.activeElement.selectionStart;
    }
  }
  clearTemplates();
  renderTemplates();
  console.log(path);
  if(path) {
    var elem = lookupElementByXPath(path)
    elem.focus();
    console.log("CURSOR: " + cursor_position);
    if(cursor_position != null) {
      console.log("MOVING: " + cursor_position);
      //setCaretPosition(elem, cursor_position)
      elem.setSelectionRange(cursor_position, cursor_position)
    }
  }

}

window.$rebind = rebindTemplates;

document.addEventListener('DOMContentLoaded', renderTemplates);


function ajax(url, cb) {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE ) {
            if (xmlhttp.status == 200) {
                cb( xmlhttp.responseText );
            }
            else if (xmlhttp.status == 400) {
                alert('There was an error 400');
            }
            else {
                alert('something else other than 200 was returned');
            }
        }
    };

    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}
//})();


