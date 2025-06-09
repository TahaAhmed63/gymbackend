const cron = require('node-cron');
const axios = require('axios');
const { supabaseClient } = require('../config/supabase');

// Run member status check every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running scheduled member status check...');
    
    // Get all gyms
    const { data: gyms, error: gymsError } = await supabaseClient
      .from('gyms')
      .select('id');

    if (gymsError) {
      throw gymsError;
    }

    // For each gym, check member status
    for (const gym of gyms) {
      try {
        // Get gym's automation settings
        const { data: settings, error: settingsError } = await supabaseClient
          .from('gym_settings')
          .select('auto_inactive_members')
          .eq('gym_id', gym.id)
          .single();

        if (settingsError) {
          console.error(`Error getting settings for gym ${gym.id}:`, settingsError);
          continue;
        }

        // Only proceed if automation is enabled
        if (settings?.auto_inactive_members) {
          // Call the member status check endpoint
          await axios.post(`${process.env.API_URL}/members/check-status`, {}, {
            headers: {
              'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`
            }
          });
        }
      } catch (error) {
        console.error(`Error processing gym ${gym.id}:`, error);
      }
    }

    console.log('Scheduled member status check completed');
  } catch (error) {
    console.error('Error in scheduled member status check:', error);
  }
}); 