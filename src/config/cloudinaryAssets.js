const CLOUDINARY_IMAGE_BASE =
  'https://res.cloudinary.com/dzksawh1d/image/upload/f_auto,q_auto';

export const cloudinaryImage = (publicId) =>
  `${CLOUDINARY_IMAGE_BASE}/${publicId}`;

export const CLOUDINARY_ASSETS = {
  headers: {
    development: cloudinaryImage('npt-dashboard/images/headers/development'),
    production: cloudinaryImage('npt-dashboard/images/headers/production'),
    protection: cloudinaryImage('npt-dashboard/images/headers/protection'),
    strategy: cloudinaryImage('npt-dashboard/images/headers/strategy'),
  },
  infographics: (number) =>
    cloudinaryImage(
      `npt-dashboard/images/infographics/npt-smart-agri-${number}`
    ),
  pesticides: {
    mixlabHero: cloudinaryImage(
      'npt-dashboard/images/pesticides/mixlab_hero_v2'
    ),
    mixlabHeroBanner: cloudinaryImage(
      'npt-dashboard/images/pesticides/mixlab_hero_banner'
    ),
    mixlabFlask: cloudinaryImage(
      'npt-dashboard/images/pesticides/mixlab_flask_3d'
    ),
  },
  agriHero: cloudinaryImage('npt-dashboard/nakhon-pathom-agri-hero'),
  richMenu: cloudinaryImage('npt-dashboard/nong_khaolam_richmenu'),
  avatars: {
    landingChatbot: cloudinaryImage(
      'npt-dashboard/avatars/landing-chatbot-avatar-transparent'
    ),
    khaolam: cloudinaryImage('npt-dashboard/avatars/khaolam-avatar'),
  },
};
