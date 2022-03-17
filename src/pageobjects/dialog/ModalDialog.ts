import { PluginDecorator, IPluginDecorator, BasePage } from '../utils'
import { dialog } from '../../locators/1.61.0'

/**
 * Page Object for Custom Style Modal Dialogs (non-native)
 */
export interface ModalDialog extends IPluginDecorator<typeof dialog.Dialog> {}
@PluginDecorator(dialog.Dialog)
export class ModalDialog extends BasePage {
    /**
     * Get the dialog's message in a Promise
     */
    async getMessage(): Promise<string> {
        return this.message$.getText();
    }

    /**
     * Get the details message in a Promise
     */
    async getDetails(): Promise<string> {
        return this.details$.getText();
    }

    /**
     * Get the list of buttons as WebElements
     * 
     * @returns Promise resolving to Array of WebElement items representing the buttons
     */
    async getButtons() {
        return this.buttonContainer$.$$(this.locators.button)
    }

    /**
     * Push a button with given title if it exists
     * 
     * @param title title/text of the button
     */
    async pushButton(title: string): Promise<void> {
        const buttons = await this.getButtons();
        const titles = await Promise.all(buttons.map(async btn => btn.getAttribute('title')));
        const index = titles.findIndex(value => value === title);
        if (index > -1) {
            await buttons[index].click();
        }
    }

    /**
     * Close the dialog using the 'cross' button
     */
    async close(): Promise<void> {
        return this.closeButton$.click();
    }
}