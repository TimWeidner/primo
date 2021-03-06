import { get } from 'svelte/store';

export const TbButton = (title, attr, icon, key = null, action = null, fn = () => {}, buttonStyles = '') => ({
  title,
  attr, 
  icon,
  key,
  action,
  onclick: fn,
  buttonStyles
});

export const User = (user = {
  uid: null,
  email: null,
  verified: false,
  githubUsername: null,
  githubToken: null,
  role: null,
  signedIn: false,
  canEditPage: false
  // domains: []
}) => ({
  uid: user.uid,
  email: user.email,
  verified: user.verified,
  type: user.type || 'email',
  githubUsername: user.githubUsername,
  githubToken: user.githubToken,
  role: user.role,
  signedIn: user.signedIn,
  canEditPage: user.canEditPage
  // domains
})


export const Domain = ({
  hostname,
  status,
  cname,
  created,
  updated,
  acm_status,
  acm_status_reason
}) => ({
  hostname,
  status: status || 'awaiting connection',
  record: cname || null,
  created: created || null,
  updated: updated || null,
  ssl: SSL({ acm_status, acm_status_reason })
})

const SSL = ({ acm_status, acm_status_reason }) => ({
  processing: acm_status === null,
  active: acm_status === 'cert issued' ? true : false,
  status: {
    'cert issued' : 'SSL certificate active',
    'failing' : 'SSL certification failed',
  }[acm_status] || 'SSL certification not yet initiated',
  reason: acm_status_reason || null
})


export const Theme = (id, label, source) => ({ id, label, source })

export const Font = (family, category, variants) => (
  { 
    heading: {
      family: family || 'Roboto', 
      category: category || 'sans-serif', 
      variants: variants || [400, 500, 700]
    },
    body: {
      family: family || 'Roboto', 
      category: category || 'sans-serif', 
      variants: variants || [400, 500, 700]
    }
  }
)