<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  const dispatch = createEventDispatcher()
  import _ from 'lodash'
  import {PrimaryButton} from '../../../components/buttons'

  import ModalHeader from '../ModalHeader.svelte'
  import Container from './ComponentContainer.svelte'
  import {createSymbol} from '../../../const'
  import { wrapInStyleTags, getUniqueId } from '../../../utils'

  import {editorViewDev,userRole} from '../../../stores/app'
  import modal from '../../../stores/app/modal'
  import site from '../../../stores/data/site'
  import symbols from '../../../stores/data/site/symbols'
  import content from '../../../stores/data/page/content'

  export let button;

  let componentBeingEdited = null
  function editSymbol(symbol) {
    modal.show(
      'COMPONENT_EDITOR', 
      {
        component: symbol,
        header: {
          title: `Edit ${symbol.title || 'Symbol'}`,
          icon: 'fas fa-clone',
          button: {
            label: `Save ${symbol.title || 'Symbol'}`,
            icon: 'fas fa-save',
            onclick: async (symbol) => {
              modal.show('COMPONENT_LIBRARY', {button})
              const [newSymbols] = await Promise.all([
                symbols.place(symbol),
                content.updateInstances(symbol),
                // updateInstancesInDomain(symbol), // TODO
              ])
              site.save({ symbols: newSymbols })
            }
          }
        } 
      }
    )
  }

  async function addSymbol() {
    const symbol = createSymbol()
    editSymbol(symbol)
  }

  async function deleteSymbol(symbol) {
    const newSymbols = symbols.remove(symbol.id)
    site.save({ symbols: newSymbols })
  }

  function addComponentToPage(symbol) {
    const instance = createInstance(symbol)
    button.onclick(instance)
  }

  function getID(symbol) {
    return symbol.id+symbol.value.final.html+symbol.value.final.css
  }

  function updateSymbol(symbol, value) {
    symbols.place({
      ...symbol,
      ...value
    })
    site.save({ symbols: $symbols })
  }

  function createInstance(symbol) {
    const instanceID = getUniqueId()
    const instanceFinalCSS = symbol.value.final.css.replace(RegExp(`${symbol.id}`, 'g'),`${instanceID}`)
    return {
      type: 'component',
      id: instanceID,
      symbolID: symbol.id,
      value: {
        ...symbol.value,
        final: {
          ...symbol.value.final,
          css: instanceFinalCSS
        }
      }
    }
  }

</script>

<ModalHeader 
  icon="fas fa-clone"
  title="Add Symbol"
  variants="mb-4"
/>

{#if $editorViewDev}
  <PrimaryButton on:click={addSymbol} variants="mb-4">
    <i class="fas fa-plus mr-1"></i>
    <span>Create New Symbol</span>
  </PrimaryButton>
{:else if $symbols.length === 0}
  <p class="p-48 text-center">
    {#if $userRole === 'developer'}
      This is where your reusable components go (we call them Symbols). You'll need to be in Developer mode to make a Symbol.
    {:else}
      This is where your reusable components go (we call them Symbols), but you'll need the site developer to make some first.
    {/if}
  </p>
{/if}

{#each $symbols as symbol (getID(symbol))}
  <Container 
    on:update={({detail}) => updateSymbol(symbol, detail)}
    on:edit={() => editSymbol(symbol)}
    on:delete={() => deleteSymbol(symbol)}
    on:select={() => addComponentToPage(symbol)}
    component={symbol}
  />
{/each}