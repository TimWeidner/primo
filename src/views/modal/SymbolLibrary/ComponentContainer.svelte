<script>
  import {IconButton} from '../../../components/buttons'
  import {fade} from 'svelte/transition'
  import { createEventDispatcher, onMount } from 'svelte';
  const dispatch = createEventDispatcher();
  import {getComponentPreviewCode} from '../../../utils'

  import tailwind from '../../../stores/data/tailwind'
  import site from '../../../stores/data/site'
  import pageData from '../../../stores/data/pageData'
  let {styles} = $site

  export let component;
  export let title = component.title || '';

  let editingTitle = false
  let titleInput

  function changeTitle() {
    editingTitle = false
    if (title !== component.title) {
      dispatch('update', { title })
    }
  }

  function saveComponentHeight(newIframeHeight) {
    if (newIframeHeight !== component.height) {
      dispatch('update', { height })
    }
  }

  let iframe
  let iframeHeight = component.height || 250

  onMount(() => {
    iframe.onload = () => {
      iframeHeight = iframe.contentWindow.document.body.scrollHeight
      // saveComponentHeight(iframeHeight)
    }
  })

  const parentStyles = $tailwind + $site.styles.final + $pageData.styles.final
  const previewCode = getComponentPreviewCode(component, parentStyles) 

  let iframeLoaded = false

</script>

<article class="message component-wrapper mt-2" in:fade={{ delay: 250, duration: 200 }} id="symbol-{component.id}">
  <form on:submit|preventDefault={changeTitle}>
    <input type="text" bind:this={titleInput} bind:value={title} on:blur={changeTitle} on:focus={() => editingTitle = true}/>
  </form>
  <div class="message-header">
    <p class="component-label" on:click={() => titleInput.focus()} class:editing={editingTitle}>
      <i class="far fa-edit text-xs text-gray-500 cursor-pointer mr-2"></i>
      <span>{title}</span>
    </p>
    <div class="buttons">
      <IconButton label="Delete" icon="trash" on:click={() => dispatch('delete')} />  
      <IconButton label="Edit" icon="edit" on:click={() => dispatch('edit')} />  
      <IconButton label="Add" variants="is-main" icon="plus-circle" on:click={() => dispatch('select')} />  
    </div>
  </div>
  <div class="message-body">
    <iframe on:load={() => {iframeLoaded = true}} class:fadein={iframeLoaded} class="w-full shadow-lg" style="height:{iframeHeight}px" bind:this={iframe} title="component preview" srcdoc={previewCode}></iframe>
  </div>
</article>

<style> 
  .buttons {
    @apply flex justify-end;
  }
  iframe {
    @apply w-full opacity-0 transition-opacity duration-200;
  }
  .fadein {
    @apply opacity-100;
  }
  .component-wrapper {
    @apply relative shadow-xl mb-8;
  }
  .message-header {
    @apply flex justify-between items-center bg-gray-100 p-2;
  }
  .component-label {
    @apply flex items-center flex-1 font-bold text-gray-800 pl-2;
    min-width: 3rem;
    height: 1.5rem;
  }
  .component-label:before {
    content: '';
    display: inline-block;
    height: 1rem;
    width: 0;
    margin-right: 0;
    transition: margin-right 0.25s, width 0.25s;
    background: gainsboro;
  }
  input {
    user-select: none;
    position: absolute;
    opacity: 0;
  }
  .editing:before {
    content: '';
    width: 4px;
    margin-right: 5px;
    transition: margin-right 0.25s, width 0.25s;
  }
  /* 
  .component-wrapper:not(:last-child) {
    margin-bottom: 1rem;
  } */

</style>