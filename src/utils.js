import _ from "lodash";
import axios from 'axios'
import {getContext} from 'svelte'
import { get } from 'svelte/store'
import ShortUniqueId from "short-unique-id";
import objectPath from 'object-path'

import domainInfo from './stores/data/domainInfo'
import user from './stores/data/user'
import {getCombinedTailwindConfig} from './stores/data/tailwind'
import site from './stores/data/site'
import pageData from './stores/data/pageData'


const functionsServer = (endpoint) => get(domainInfo).onDev ? `http://localhost:9000/primo-d4041/us-central1/${endpoint}` : `https://us-central1-primo-d4041.cloudfunctions.net/${endpoint}`

export const ax = {
  async post(endpoint, params, onError = () => {}) {
    // console.log('post:', functionsServer(endpoint), params)
    try {
      let {data} = await axios.post(functionsServer(endpoint), params)
      return data
    } catch(e) {
      console.error(e)
      onError(e)
      return {}
    }
  },
  async get(endpoint) {
    // console.log('get:', functionsServer(endpoint))
    try {
      return await axios.get(functionsServer(endpoint))
    } catch(e) {
      console.error(e)
      return e
    }
  }
}

let Handlebars
export async function parseHandlebars(code, data) {
  if (!Handlebars) {
    Handlebars = await import('handlebars/dist/handlebars.min.js')
  } 
  const template = Handlebars.compile(code);
  return template(data)
}


export async function convertFieldsToData(fields, typeToUpdate = 'static') {
  let literalValueFields = fields
    .filter(f => f.type !== 'js')
    .map(f => ({
      key: f.key,
      value: f.type === 'number' ? parseInt(f.value) : f.value
    }))
    .reduce((obj, item) => (obj[item.key] = item.value, obj) ,{});

  var parsedFields = await Promise.all(
    fields.map(async (field) => {
      if (field.type === 'api' && (typeToUpdate === 'api' || typeToUpdate === 'all')) {
        let data
        try {
          let res = await axios.get(field.endpoint)
          data = res.data
        } catch(e) { console.error(e) }
        // const { data } = await axios.get(field.endpoint)
        const finalData = (typeof data === 'object' && field.endpointPath) ? objectPath.get(data, field.endpointPath || JSON.stringify(data)) : data
        field.value = finalData

        console.log({
          ['API Endpoint Accessed'] : field.endpoint,
          ['Endpoint Path'] : field.endpointPath,
          ['Raw data'] : data,
          ['Final result'] : finalData
        })

      } else if (field.type === 'js' && (typeToUpdate === 'js' || typeToUpdate === 'all')) {

        let data;

        try {
          data = Function('fields', field.code)(literalValueFields)
        } catch(e) {
          console.error(e)
        }

        literalValueFields = { 
          ...literalValueFields, 
          [field.key] : data
        }

        field.value = data;
      } else if (field.type === 'group') {
        if (field.fields) {
          field.value = _.chain(field.fields)
            .keyBy('key')
            .mapValues('value')
            .value();
        }
      }
      return field
    }
  ));

  return _.chain(parsedFields)
  .keyBy('key')
  .mapValues('value')
  .value();
}

// async function hydrateComponentFields (node) {

//   if (node.type === 'attachment' && node.attachment.contentType === 'custom-embed' && node.attachment.fields.length > 0) {
//     let data = await convertFieldsToData(node.attachment.fields, 'all')
//     node.attachment.content = await parseHandlebars(node.attachment.raw, data)
//   }
  
//   return Promise.resolve(node)
// }


export async function compileScss(scss) {
  let result = await ax.post('primo/scss', { scss })
  return result;
}

export async function notify(params, appName = 'firebase') {
  ax.post('primo/notify', {
    appName,
    params
  })
}

export function scrambleIds(content) {
  let IDs = []
  const newContent = content.map(section => {
    const newID = getUniqueId()
    IDs.push([ section.id, newID])
    return {
      ...section,
      id: newID,
      columns: section.columns.map(column => {
        const newID = getUniqueId()
        IDs.push([ column.id, newID])
        return {
          ...column,
          id: newID,
          rows: column.rows.map(row => {
            const newID = getUniqueId()
            IDs.push([ row.id, newID])
            return {
              ...row, 
              id: newID
            }
          })
        }
      })
    }
  })
  return [ newContent, IDs ]
}


// Lets us debounce from reactive statements
export function createDebouncer(time) {
  return _.debounce(val => {
    const [ fn, arg ] = val
    fn(arg)
  }, time)
}


export function getUniqueId() {
  return new ShortUniqueId().randomUUID(5).toLowerCase();
}

export function getComponentPreviewCode(component, parentStyles) {
  return `<div id="component-${component.id}">${component.value.final.html}</div><style>${parentStyles}${component.value.final.css}</style><script>${component.value.final.js}</script>`
}

export function wrapInStyleTags(css, id = null) {
  return `<style type="text/css" ${ id ? `id = "${id}"` : ''}>${css}</style>`
}

export async function checkIfUserHasSubdomain(email, subdomain) {
  if (email && subdomain) {
    const res = await ax.post('firestore/subdomain-has-user', { email, subdomain })
    return res
  } else {
    return false
  }
}

export async function sendSiteInvitation(domain, email, role) {
  const res = await ax.post('primo/send-invite', { domain, email, role })
  return res
}

export async function processStyles(css, html, options = {}) {
  const {processPostCSS} = getContext('functions')
  try {
    const result = await processPostCSS({css, html, options})
    if (result.error) {
      console.error(result.error)
      return '';
    } else {
      return result;
    }
  } catch(e) {
    console.error(e)
  }
}


const boilerplate = async (html) => {
  return `
    <!doctype html>

    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" type="text/css" href="./styles.css" />
      <link rel="stylesheet" type="text/css" href="./${get(domainInfo).page||'index'}.css" />
      <script src="./${get(domainInfo).page||'index'}.js"></script>
      ${
        get(pageData).dependencies.libraries.length > 0 
        ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/systemjs/6.3.1/system.min.js" integrity="sha256-15j2fw0zp8UuYXmubFHW7ScK/xr5NhxkxmJcp7T3Lrc=" crossorigin="anonymous"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/systemjs/6.3.2/extras/use-default.min.js" integrity="sha256-uVDULWwA/sIHxnO31dK8ThAuK46MrPmrVn+JXlMXc5A=" crossorigin="anonymous"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/systemjs/6.3.2/extras/amd.min.js" integrity="sha256-7vS4pPsg7zx1oTAJ1zQIr2lDg/q8anzUCcz6nxuaKhU=" crossorigin="anonymous"></script>
          <script type="systemjs-importmap">${JSON.stringify({"imports": _.mapValues(_.keyBy(libraries.filter(l => l.src.slice(-5).includes('.js')), 'name'), 'src')})}</script>`
        : ``
      }
      `+
      `${get(pageData).wrapper.head.final}
    </head>

    <body data-instant-intensity="all" class="primo-page">   
      ${html}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/instant.page/5.1.0/instantpage.js" integrity="sha256-DdSiNPR71ROAVMqT6NiHagLAtZv9EHeByYuVxygZM5g=" crossorigin="anonymous"></script>
    </body>
    </html>
  `
}

export function getComponentCSS(content) {
  return _.flattenDeep(content.map(section =>
    section.columns.map(column => 
      column.rows
        .filter(r => r.type === 'component')
        .map(row => row.value.final.css)
    )
  )).join('\n\n')
}

export function buildSiteHTML(pages) {
  const siteHTML = pages.map(p => buildPagePreview(p.content))
  return siteHTML
}

export function buildPagePreview(content) {
  let html = ''
  content.forEach(section => {
    html += `<div id="section-${section.id}">\n` +
              `\t<div class="columns flex flex-wrap ${section.width === 'contained' ? 'container' : ''}">\n`
    section.columns.forEach(column => {
      html += `\t\t<div class="column ${column.size}" id="column-${column.id}">\n`
      column.rows.forEach(row => {
        html += row.type === 'component' 
                ? `\t\t\t<div class="primo-component">\n` +
                    `\t\t\t\t<div id="component-${row.id}" class="w-full">${row.value.final.html}</div>\n` +
                    `\t\t\t\t<script>${row.value.final.js}</script>\n` + 
                    `\t\t\t\t<style>${row.value.final.css}</style>\n` + 
                  `\t\t\t</div>\n`
                : `\t\t\t<div class="primo-content">\n` +
                    `\t\t\t\t${row.value.html}\n` + 
                  `\t\t\t</div>\n`
      })
      html += `\t\t</div>\n`
    })
    html += `\t</div>\n` +
          `</section>\n`
  })

  // html += get(site).styles // TODO

  return html
}

export async function buildPageCSS(content, HTML, rawCSS, tailwindConfig) {

  const components = _.flatMapDeep(content, (section) => section.columns.map(column => column.rows.filter(row => row.type === 'component')))
  const componentStyles = components.map(component => `#component-${component.id} {${component.value.raw.css}}`).join('\n')

  const allStyles = rawCSS + componentStyles

  const pageStyles = await processStyles(
    allStyles, 
    HTML, 
    { 
      includeBase: true,
      includeTailwind: true,
      purge: true,
      tailwindConfig
    }
  )

  return pageStyles

}


export async function hydrateAllComponents(content) {
  return await Promise.all(
    content.map(async section => ({
      ...section,
      columns: await Promise.all(
        section.columns.map(async column => ({
        ...column,
        rows: await Promise.all(
          column.rows.map(async row => {
            if (row.type === 'content') return row
            else return hydrateComponent(row)
          })
        )
      })))
    }))
  )
}

export async function hydrateComponent(component) {
  const {value} = component
  const fields = getAllFields(component)
  const data = await convertFieldsToData(fields, 'all')
  const finalHTML = await parseHandlebars(value.raw.html, data)
  component.value.final.html = finalHTML
  return component
}

export function getAllFields(component = null) {
  const siteFields = _.cloneDeep(get(site).fields)
  const pageFields = _.cloneDeep(get(pageData).fields)
  let componentFields = []
  if (component) {
    componentFields = component.value.raw.fields;
  }
  const allFields = _.unionBy(componentFields, pageFields, siteFields, "key");
  return allFields
}

export function duplicatePage(page, title, url) {
  const newPage = _.cloneDeep(page)
  const [newContent, IDmap] = scrambleIds(page.content)
  newPage.content = newContent
  newPage.title = title
  newPage.id = url

  // Replace all the old IDs in the page styles with the new IDs
  let rawPageStyles = newPage.styles.raw
  let finalPageStyles = newPage.styles.final
  IDmap.forEach(([oldID, newID]) => {
    newPage.styles.raw = rawPageStyles.replace(
      new RegExp(oldID, 'g'),
      newID
    )
    newPage.styles.final = finalPageStyles.replace(
      new RegExp(oldID, 'g'),
      newID
    )
  })

  // Replace all the old IDs in the components
  IDmap.forEach(([oldID, newID]) => {
    newPage.content = newPage.content.map((section) => ({
      ...section,
      columns: section.columns.map((column) => ({
        ...column,
        rows: column.rows.map((row) =>
          row.type === 'component'
            ? {
                ...row,
                value: {
                  ...row.value,
                  raw: {
                    ...row.value.raw,
                    css: row.value.raw.css.replace(
                      new RegExp(oldID, 'g'),
                      newID
                    ),
                  },
                  final: {
                    ...row.value.final,
                    css: row.value.final.css.replace(
                      new RegExp(oldID, 'g'),
                      newID
                    ),
                  },
                },
              }
            : row
        ),
      })),
    }))
  })
  return newPage
}
  
