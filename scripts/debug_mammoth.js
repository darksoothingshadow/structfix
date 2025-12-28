
import mammoth from 'mammoth';

const filePath = '/root/structfix/importating AI canton consultations/02_import/input texts/Revision Personalverordnung.docx';

mammoth.convertToHtml({path: filePath})
    .then(function(result){
        const html = result.value; 
        console.log(html.substring(0, 3000));
    })
    .catch(function(err) {
        console.log(err);
    });
